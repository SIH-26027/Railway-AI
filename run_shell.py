import sys
import subprocess
import os

sys32 = r"C:\Windows\System32"
win = r"C:\Windows"
wbem = r"C:\Windows\System32\Wbem"
ps_path = r"C:\Windows\System32\WindowsPowerShell\v1.0"
py_path = r"C:\Users\sarat\AppData\Local\Programs\Python\Python314"

curr_path = os.environ.get("PATH", "")
os.environ["PATH"] = ";".join([sys32, win, ps_path, wbem, py_path, curr_path])

args = sys.argv[1:]
if len(args) >= 1 and args[0].lower() == "-command":
    cmd = " ".join(args[1:])
elif args:
    cmd = " ".join(args)
else:
    sys.exit(0)

ps_exe = os.path.join(ps_path, "powershell.exe")
res = subprocess.run([ps_exe, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", cmd], stdin=subprocess.DEVNULL)
sys.exit(res.returncode)
