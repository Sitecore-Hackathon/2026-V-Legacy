export async function scanPage(url: string) {
    const response = await fetch(url);
    const html = await response.text();
    return html;
}