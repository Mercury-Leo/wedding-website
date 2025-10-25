(function (root, factory) {
    root.RandomPhoto = factory(root, root.jQuery);
})(this, function (window, $) {
    "use strict";

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function openImage(url) {
        if ($ && $.magnificPopup) {
            $.magnificPopup.open({
                items: { src: url },
                type: 'image'
            });
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    function fetchManifest(folderUrl, manifestName) {
        var url = folderUrl.replace(/\/+$/, "") + "/" + (manifestName || "manifest.json");
        return fetch(url, { cache: "no-cache" })
            .then(function (r) { if (!r.ok) throw new Error("Manifest fetch failed"); return r.json(); })
            .then(function (json) {
                var files = Array.isArray(json) ? json : (Array.isArray(json.files) ? json.files : []);
                return files.map(function (name) {
                    return folderUrl.replace(/\/+$/, "") + "/" + name.replace(/^\/+/, "");
                });
            });
    }

    /**
     * Initialize the Random Photo button to pull from a folder via manifest.json
     * @param {Object} opts
     * @param {string} opts.folder - e.g. "images/smiles"
     * @param {string} [opts.manifest="manifest.json"]
     * @param {string} [opts.buttonSelector="#randomPhotoBtn"]
     * @param {string[]} [opts.fallback=[]] - used only if manifest cannot be loaded
     */
    function init(opts) {
        opts = opts || {};
        var buttonSelector = opts.buttonSelector || "#randomPhotoBtn";
        var folder = opts.folder;
        var manifest = opts.manifest || "manifest.json";
        var fallback = Array.isArray(opts.fallback) ? opts.fallback.slice() : [];

        if (!folder) {
            if (window && window.console) console.warn("[RandomPhoto] Missing `folder` option.");
            return;
        }

        var btn = document.querySelector(buttonSelector);
        if (!btn) return;

        var poolPromise = fetchManifest(folder, manifest).catch(function () {
            // Build full URLs for fallback if provided
            return fallback.map(function (name) {
                return folder.replace(/\/+$/, "") + "/" + name.replace(/^\/+/, "");
            });
        });

        btn.addEventListener("click", function (e) {
            e.preventDefault();
            poolPromise.then(function (pool) {
                console.log("[RandomPhoto] Missing `pool` option.");
                if (!pool || pool.length === 0) return;
                openImage(pickRandom(pool));
            });
        });
    }

    return { init: init };
});
