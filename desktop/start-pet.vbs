Option Explicit
Dim fso, shell, dir, ps1
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = dir & "\PetOverlay.ps1"
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1 & """", 0, False
