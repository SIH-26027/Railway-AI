target_path = r"d:\SIH\Request Format\railway-ai\frontend\lib\supabase.ts"

with open(target_path, "r", encoding="utf-8") as f:
    content = f.read()

target_str = """  /**
   * Update status and remarks directly in the existing_blocks table
   */
  async updateExistingBlockStatus(
    idOrBlockId: string,
    status: 'Completed' | 'Active' | 'Cancelled' | 'Scheduled',
    remarks?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !idOrBlockId) return false;

    try {
      const url = getSupabaseUrl();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrBlockId);
      const filter = isUuid ? `id=eq.${idOrBlockId}` : `block_id=eq.${encodeURIComponent(idOrBlockId)}`;

      const payload: Record<string, any> = {
        status: status,
      };
      if (remarks !== undefined) {
        payload.remarks = remarks;
      }

      const res = await fetchWithTimeout(`${url}/rest/v1/existing_blocks?${filter}`, {
        method: 'PATCH',
        headers: getHeaders({
          Prefer: 'return=representation',
        }),
        body: JSON.stringify(payload),
      }, 4500);

      if (res.ok) {
        console.log(`[Supabase] Successfully updated existing_blocks (${idOrBlockId}) to status ${status}`);
        return true;
      } else {
        const errText = await res.text();
        console.error(`[Supabase] Error updating existing_blocks (${res.status}): ${errText}`);
        return false;
      }
    } catch (err: any) {
      console.error('[Supabase] Exception updating existing_blocks:', err?.message || err);
      return false;
    }
  },
};"""

replacement_str = """  /**
   * Update availability_status directly in the corridors table
   */
  async updateCorridorAvailability(
    corridorIdOrName: string,
    status: 'Available' | 'Blocked' | 'Restricted Speed',
    blockSection?: string,
    line?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !corridorIdOrName) return false;

    try {
      const url = getSupabaseUrl();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(corridorIdOrName);
      
      let filter = '';
      if (isUuid) {
        filter = `id=eq.${corridorIdOrName}`;
      } else {
        const cleanName = encodeURIComponent(corridorIdOrName.trim());
        filter = `corridor_name=ilike.*${cleanName}*`;
        if (blockSection) {
          filter += `&block_section=ilike.*${encodeURIComponent(blockSection.trim())}*`;
        }
        if (line) {
          filter += `&line=eq.${encodeURIComponent(line.trim())}`;
        }
      }

      const res = await fetchWithTimeout(`${url}/rest/v1/corridors?${filter}`, {
        method: 'PATCH',
        headers: getHeaders({
          Prefer: 'return=representation',
        }),
        body: JSON.stringify({ availability_status: status }),
      }, 4500);

      if (res.ok) {
        console.log(`[Supabase] Successfully updated corridor (${corridorIdOrName}) availability to ${status}`);
        return true;
      } else {
        const errText = await res.text();
        console.error(`[Supabase] Error updating corridor availability (${res.status}): ${errText}`);
        return false;
      }
    } catch (err: any) {
      console.error('[Supabase] Exception updating corridor availability:', err?.message || err);
      return false;
    }
  },

  /**
   * Update status and remarks directly in the existing_blocks table,
   * and automatically sync the corridor availability status.
   */
  async updateExistingBlockStatus(
    idOrBlockId: string,
    status: 'Completed' | 'Active' | 'Cancelled' | 'Scheduled',
    remarks?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !idOrBlockId) return false;

    try {
      const url = getSupabaseUrl();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrBlockId);
      const filter = isUuid ? `id=eq.${idOrBlockId}` : `block_id=eq.${encodeURIComponent(idOrBlockId)}`;

      // 1. Fetch current block record to obtain corridor_id
      let corridorId: string | null = null;
      let blockDbId: string | null = null;
      try {
        const fetchBlockRes = await fetchWithTimeout(`${url}/rest/v1/existing_blocks?${filter}&select=id,block_id,corridor_id,line`, {
          headers: getHeaders(),
        }, 3000);
        if (fetchBlockRes.ok) {
          const rows = await fetchBlockRes.json();
          if (rows && rows.length > 0) {
            corridorId = rows[0].corridor_id;
            blockDbId = rows[0].id;
          }
        }
      } catch (e) {
        console.warn('[Supabase] Could not fetch corridor_id before block update:', e);
      }

      // 2. Update existing_blocks table
      const payload: Record<string, any> = {
        status: status,
      };
      if (remarks !== undefined) {
        payload.remarks = remarks;
      }

      const res = await fetchWithTimeout(`${url}/rest/v1/existing_blocks?${filter}`, {
        method: 'PATCH',
        headers: getHeaders({
          Prefer: 'return=representation',
        }),
        body: JSON.stringify(payload),
      }, 4500);

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Supabase] Error updating existing_blocks (${res.status}): ${errText}`);
        return false;
      }

      console.log(`[Supabase] Successfully updated existing_blocks (${idOrBlockId}) to status ${status}`);

      // 3. Automatically synchronize corridor availability status
      if (corridorId) {
        if (status === 'Completed' || status === 'Cancelled') {
          // Check if any other block is still Active on this corridor
          const otherFilter = blockDbId
            ? `corridor_id=eq.${corridorId}&status=eq.Active&id=neq.${blockDbId}&select=id`
            : `corridor_id=eq.${corridorId}&status=eq.Active&select=id`;
          
          let anyActiveRemaining = false;
          try {
            const checkRes = await fetchWithTimeout(`${url}/rest/v1/existing_blocks?${otherFilter}`, {
              headers: getHeaders(),
            }, 3000);
            if (checkRes.ok) {
              const activeRows = await checkRes.json();
              if (activeRows && activeRows.length > 0) {
                anyActiveRemaining = true;
              }
            }
          } catch (e) {
            console.warn('[Supabase] Could not check active blocks on corridor:', e);
          }

          if (!anyActiveRemaining) {
            const isRestricted = remarks && /speed\\s*restriction|TSR|caution\\s*order|45\\s*km\\/h|30\\s*km\\/h/i.test(remarks);
            const targetCorridorStatus = isRestricted ? 'Restricted Speed' : 'Available';
            await this.updateCorridorAvailability(corridorId, targetCorridorStatus);
          }
        } else if (status === 'Active') {
          await this.updateCorridorAvailability(corridorId, 'Blocked');
        }
      }

      return true;
    } catch (err: any) {
      console.error('[Supabase] Exception updating existing_blocks:', err?.message || err);
      return false;
    }
  },
};"""

if target_str in content:
    content = content.replace(target_str, replacement_str, 1)
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully replaced updateExistingBlockStatus in supabase.ts!")
else:
    # Try normalizing CRLF / LF
    c_norm = content.replace("\r\n", "\n")
    t_norm = target_str.replace("\r\n", "\n")
    r_norm = replacement_str.replace("\r\n", "\n")
    if t_norm in c_norm:
        c_norm = c_norm.replace(t_norm, r_norm, 1)
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(c_norm)
        print("Successfully replaced updateExistingBlockStatus (normalized) in supabase.ts!")
    else:
        print("Target string not found in supabase.ts")
