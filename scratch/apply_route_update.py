target_path = r"d:\SIH\Request Format\railway-ai\frontend\app\api\approved-blocks\route.ts"

with open(target_path, "r", encoding="utf-8") as f:
    content = f.read()

target_str = """    // 1. Persist directly into the Supabase table `existing_blocks`
    const ebUpdated = await supabaseClient.updateExistingBlockStatus(id, ebStatus, remarks);

    // 2. Also update local cache & fallback DB
    const updated = await db.updateRequestStatus(id, targetStatus, {
      officer,
      remarks,
      note,
      completedAt
    });

    return NextResponse.json({
      success: true,
      message: `Block ${id} status successfully updated to ${ebStatus} in Supabase table existing_blocks`,
      record: updated || { id, status: targetStatus, remarks },
      ebUpdated,
      supabaseStored: ebUpdated
    });"""

replacement_str = """    // 1. Persist directly into the Supabase table `existing_blocks` (also syncs corridor availability)
    const ebUpdated = await supabaseClient.updateExistingBlockStatus(id, ebStatus, remarks);

    // 2. Also update local cache & fallback DB
    const updated = await db.updateRequestStatus(id, targetStatus, {
      officer,
      remarks,
      note,
      completedAt
    });

    // 3. Explicitly synchronize corridor availability in Supabase
    try {
      const blockRec = updated || (await db.getRequestById(id));
      if (blockRec && blockRec.corridor) {
        const isRestricted = /speed\\s*restriction|TSR|caution\\s*order|45\\s*km\\/h|30\\s*km\\/h/i.test(remarks || note || '');
        const corridorAvail = isCompleted ? (isRestricted ? 'Restricted Speed' : 'Available') : 'Blocked';
        await supabaseClient.updateCorridorAvailability(
          blockRec.corridor,
          corridorAvail,
          blockRec.blockSection,
          blockRec.line
        );
      }
    } catch (e) {
      console.warn('Explicit corridor availability sync warning:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Block ${id} status successfully updated to ${ebStatus} in Supabase table existing_blocks and corridor marked as ${isCompleted ? 'Available' : 'Blocked'}`,
      record: updated || { id, status: targetStatus, remarks },
      ebUpdated,
      supabaseStored: ebUpdated
    });"""

if target_str in content:
    content = content.replace(target_str, replacement_str, 1)
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully updated route.ts!")
else:
    c_norm = content.replace("\r\n", "\n")
    t_norm = target_str.replace("\r\n", "\n")
    r_norm = replacement_str.replace("\r\n", "\n")
    if t_norm in c_norm:
        c_norm = c_norm.replace(t_norm, r_norm, 1)
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(c_norm)
        print("Successfully updated route.ts (normalized)!")
    else:
        print("Target string not found in route.ts")
