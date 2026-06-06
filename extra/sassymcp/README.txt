Bundled SassyMCP — makes the Mesh/Dashboard/Phone tabs work standalone.

Drop `sassymcp.exe` (the frozen SassyMCP build) into this folder before
running `npm run build`. electron-builder copies this folder to the app's
resources/sassymcp/, and Sassy Brain auto-detects it at
  <app>/resources/sassymcp/sassymcp.exe
and runs `sassymcp.exe mesh board|brain|phone|announce` for the mesh tabs.

If this folder has no sassymcp.exe, the app still ships fine — it falls back to
locating SassyMCP on PATH / standard install dirs, and if none is found the
mesh tabs degrade gracefully (the consensus chat is unaffected).

Build sassymcp.exe from the SassyMCP repo:  pyinstaller sassymcp.spec
