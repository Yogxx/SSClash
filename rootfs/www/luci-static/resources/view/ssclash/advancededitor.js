'use strict';
'require view';
'require fs';

return view.extend({
    tinyFmPaths: [
        {
            path: '/www/tinyfilemanager',
            urls: [
                '/tinyfilemanager/tinyfilemanager.php?p=etc%2Fssclash',
                '/tinyfilemanager/index.php?p=etc%2Fssclash'
            ]
        },
        {
            path: '/www/tinyfm',
            urls: [
                '/tinyfm/tinyfm.php?p=etc%2Fssclash',
                '/tinyfm/index.php?p=etc%2Fssclash'
            ]
        }
    ],

    findValidPath: async function() {
        for (const { path, urls } of this.tinyFmPaths) {
            try {
                const stat = await fs.stat(path);
                if (stat.type === 'directory') {
                    const url = await this.testUrls(urls);
                    if (url) return url;
                }
            } catch (_) {
                // Ignore errors and continue to next path
            }
        }
        return null;
    },

    testUrls: function(urls) {
        return urls.reduce((promise, url) => {
            return promise.catch(() => new Promise((resolve, reject) => {
                fetch(url + '?_=' + Date.now(), {
                    method: 'HEAD',
                    cache: 'no-store',
                    credentials: 'same-origin'
                })
                .then(res => res.ok ? resolve(url) : reject())
                .catch(reject);
            }));
        }, Promise.reject());
    },

    load: function() {
        return this.findValidPath();
    },

    render: function(iframePath) {
        if (iframePath) {
            return this.renderIframe(`http://${window.location.hostname}${iframePath}`);
        }

        return E('div', { class: 'cbi-section' }, [
            E('div', {
                style: 'color: red; padding: 20px; border: 1px solid #ccc; border-radius: 8px;'
            }, _('TinyFileManager not found. Please install it to use the Advanced Editor.'))
        ]);
    },

    renderIframe: function(url) {
        return E('div', { class: 'cbi-section' }, [
            E('iframe', {
                src: url,
                style: 'width: 100%; height: 80vh; border: none;',
                onerror: this._iframeErrorScript('Failed to load TinyFileManager.'),
                onload: this._iframeLoadCheckScript()
            }, _('Your browser does not support iframes.'))
        ]);
    },

    _iframeErrorScript: function(message) {
        return `
            this.style.display = 'none';
            const div = document.createElement('div');
            div.style.color = 'red';
            div.style.padding = '20px';
            div.innerHTML = '${message.replace(/'/g, "\\'")}';
            this.parentNode.appendChild(div);
        `;
    },

    _iframeLoadCheckScript: function() {
        return `
            try {
                const doc = this.contentDocument || this.contentWindow.document;
                if (!doc || doc.body.innerHTML.trim() === '') throw new Error();
            } catch (_) {
                this.style.display = 'none';
                const div = document.createElement('div');
                div.style.color = 'red';
                div.style.padding = '20px';
                div.innerHTML = 'Unable to load TinyFileManager content. Check CORS or permissions.';
                this.parentNode.appendChild(div);
            }
        `;
    }
});