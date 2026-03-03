#!/usr/bin/env node

/**
 * Post-build script to remove service bindings from wrangler.jsonc
 * This prevents deployment errors when the referenced worker doesn't exist yet.
 * 
 * After your first successful deployment, you can manually uncomment the
 * [[services]] section in wrangler.toml and re-deploy to enable edge caching.
 */

const fs = require("fs");
const path = require("path");

const wranglerJsoncPath = path.join(__dirname, "..", "wrangler.jsonc");

// Check if wrangler.jsonc exists (created by migration)
if (fs.existsSync(wranglerJsoncPath)) {
    try {
        let content = fs.readFileSync(wranglerJsoncPath, "utf-8");
        
        // Try parsing as JSON to validate structure
        try {
            // Remove comments for parsing (jsonc format)
            const contentWithoutComments = content
                .replace(/\/\/.*$/gm, "") // Remove line comments
                .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove block comments
            
            JSON.parse(contentWithoutComments);
        } catch (e) {
            console.warn(
                "[fix-wrangler-config] Warning: Could not parse wrangler.jsonc as valid JSON"
            );
        }

        let modified = false;

        // Remove service bindings - handle various formats
        // Match patterns like: [[services]], "services": [...], services: [...]
        const hasServiceBindings =
            /\[\[\s*services\s*\]\]/.test(content) ||
            /"?\s*services\s*"?\s*[:=]/.test(content);

        if (hasServiceBindings) {
            console.log(
                "[fix-wrangler-config] Removing service bindings from wrangler.jsonc..."
            );

            // Remove TOML-style [[services]] blocks
            content = content.replace(/\[\[\s*services\s*\]\][\s\S]*?(?=\[\[|$)/g, "");

            // Remove JSON-style services objects/arrays
            content = content.replace(
                /,?\s*"services"\s*:\s*\{[^}]*\}/gs,
                ""
            );
            content = content.replace(
                /,?\s*"services"\s*:\s*\[[^\]]*\]/gs,
                ""
            );

            // Clean up any trailing commas
            content = content.replace(/,(\s*[}\]])/g, "$1");
            content = content.replace(/,(\s*\n\s*\[)/g, "\n$1");

            fs.writeFileSync(wranglerJsoncPath, content);
            modified = true;
        }

        if (modified) {
            console.log(
                "[fix-wrangler-config] ✓ Service bindings removed from wrangler.jsonc"
            );
            console.log(
                "[fix-wrangler-config] ℹ️  To enable edge caching after first deploy:"
            );
            console.log(
                "[fix-wrangler-config]    1. Uncomment [[services]] in wrangler.toml"
            );
            console.log("[fix-wrangler-config]    2. Run: npm run deploy:cf");
        } else {
            console.log(
                "[fix-wrangler-config] ℹ️  No service bindings found to remove"
            );
        }
    } catch (error) {
        console.error(
            "[fix-wrangler-config] Error processing wrangler.jsonc:",
            error.message
        );
        process.exit(1);
    }
} else {
    console.log(
        "[fix-wrangler-config] ℹ️  wrangler.jsonc not found (uses wrangler.toml)"
    );
}
