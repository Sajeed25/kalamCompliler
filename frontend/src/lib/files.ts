/** Download text as a file, e.g. downloadText("game.py", code). */
export function downloadText(fileName: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const MAX_OPEN_BYTES = 200 * 1024;

/** Make a safe file name: letters, numbers, _ and - only. */
export function cleanFileName(name: string): string {
  const cleaned = name.trim().replace(/\.[a-z]+$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60);
  return cleaned || "my_program";
}
