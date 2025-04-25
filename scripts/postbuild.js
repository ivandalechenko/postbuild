import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "../dist");
const assetsPath = path.join(distPath, "assets");

try {
    console.log("Building...");
    await execAsync("npm run build");
    console.log("Build complete");

    if (!fs.existsSync(assetsPath)) fs.mkdirSync(assetsPath);

    // Переместить всё, кроме index.html и assets
    const entries = fs.readdirSync(distPath).filter(f => f !== "index.html" && f !== "assets");

    for (const entry of entries) {
        const oldPath = path.join(distPath, entry);
        const newPath = path.join(assetsPath, entry);
        fs.renameSync(oldPath, newPath);
    }

    console.log("Файлы перемещены в assets");

    // Обновить пути в index.html
    const indexPath = path.join(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");

    html = html.replace(/(src|href)=["'](?!http)([^"']+)["']/g, (_, attr, val) => {
        if (/^\/?assets\//.test(val)) return `${attr}="${val}"`;
        const clean = val.replace(/^\.?\//, '');
        return `${attr}="assets/${clean}"`;
    });

    fs.writeFileSync(indexPath, html);
    console.log("Пути в index.html обновлены.");

    // Обновить пути в JS-файлах
    const jsFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith(".js"));

    for (const file of jsFiles) {
        const filePath = path.join(assetsPath, file);
        let content = fs.readFileSync(filePath, "utf-8");

        // "/img/..." → "/assets/img/..."
        content = content.replace(/(["'`])\/(?!assets\/)(img\/[^"'`]+)\1/g, (_, q, rel) => {
            return `${q}/assets/${rel}${q}`;
        });

        fs.writeFileSync(filePath, content);
    }
    console.log("Пути к /img/ внутри JS-файлов обновлены.");

    // Обновить пути в CSS-файлах
    const cssFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith(".css"));

    for (const file of cssFiles) {
        const filePath = path.join(assetsPath, file);
        let content = fs.readFileSync(filePath, "utf-8");

        // url(/fonts/...) → url(/assets/fonts/...)
        content = content.replace(/url\((['"]?)\/(?!assets\/)(fonts\/[^)'"]+)\1\)/g, (_, quote, rel) => {
            return `url(${quote}/assets/${rel}${quote})`;
        });

        fs.writeFileSync(filePath, content);
    }
    console.log("Пути к /fonts/ внутри CSS-файлов обновлены.");
} catch (e) {
    console.error("Ошибка:", e);
}
