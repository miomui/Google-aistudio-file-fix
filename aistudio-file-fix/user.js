// ==UserScript==
// @name         aistudio-file-fix.js
// @namespace    https://github.com/miomiui
// @version      1.0
// @description  Bypass "Unsupported file" error in Google AI Studio. Upload .lua, .gd, .rs, .vue, shaders, and any other source code files seamlessly.
// @author       miomiui
// @match        https://aistudio.google.com/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const NATIVE_SUPPORTED = new Set([
        'txt', 'md', 'csv', 'json', 'html', 'py',
        'pdf', 'zip',
        'png', 'jpg', 'jpeg', 'webp', 'gif',
        'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a',
        'mp4', 'mov', 'webm', 'mpeg', 'avi'
    ]);

    function shouldConvert(name) {
        if (!name || typeof name !== 'string') return false;
        const parts = name.toLowerCase().split('.');
        if (parts.length < 2) return false;
        const ext = parts.pop();
        return !NATIVE_SUPPORTED.has(ext);
    }

    function convertFile(file) {
        if (!file || !shouldConvert(file.name)) return file;
        return new win.File([file], file.name + '.txt', {
            type: 'text/plain',
            lastModified: file.lastModified
        });
    }

    function processFileList(fileList, originalGetter) {
        if (!fileList || fileList.length === 0) return fileList;

        let needsConversion = false;
        for (let i = 0; i < fileList.length; i++) {
            if (shouldConvert(fileList[i].name)) {
                needsConversion = true;
                break;
            }
        }
        if (!needsConversion) return fileList;

        const dt = new win.DataTransfer();
        for (let i = 0; i < fileList.length; i++) {
            dt.items.add(convertFile(fileList[i]));
        }
        return originalGetter.call(dt);
    }

    const origInputFiles = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'files')?.get;
    if (origInputFiles) {
        Object.defineProperty(win.HTMLInputElement.prototype, 'files', {
            get() {
                const files = origInputFiles.call(this);
                return processFileList(files, origInputFiles);
            },
            configurable: true
        });
    }

    const origDTFiles = Object.getOwnPropertyDescriptor(win.DataTransfer.prototype, 'files')?.get;
    if (origDTFiles) {
        Object.defineProperty(win.DataTransfer.prototype, 'files', {
            get() {
                const files = origDTFiles.call(this);
                return processFileList(files, origDTFiles);
            },
            configurable: true
        });
    }

    if (win.DataTransferItem && win.DataTransferItem.prototype.getAsFile) {
        const origGetAsFile = win.DataTransferItem.prototype.getAsFile;
        win.DataTransferItem.prototype.getAsFile = function() {
            const file = origGetAsFile.apply(this, arguments);
            return convertFile(file);
        };
    }

    win.document.addEventListener('click', (e) => {
        if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'file') {
            e.target.removeAttribute('accept');
        }
    }, true);
})();
