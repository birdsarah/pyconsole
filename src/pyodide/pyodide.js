/** The main bootstrap script for loading pyodide.
 */

var languagePluginLoader = new Promise((resolve, reject) => {
    // This is filled in by the Makefile to be either a local file or the
    // deployed location. TODO: This should be done in a less hacky
    // way.
    const baseURL = 'pyodide/';

    ////////////////////////////////////////////////////////////
    // Package loading
    const packages = {
    };
    let loadedPackages = new Set();
    let loadPackage = (names) => {
        if (Array.isArray(names)) {
            names = [names];
        }

        // DFS to find all dependencies of the requested packages
        let queue = new Array(names);
        let toLoad = new Set();
        while (queue.length) {
            const package = queue.pop();
            if (!packages.hasOwnProperty(package)) {
                throw `Unknown package '${package}'`;
            }
            if (!loadedPackages.has(package)) {
                toLoad.add(package);
                packages[package].forEach((subpackage) => {
                    if (!loadedPackages.has(subpackage) &&
                        !toLoad.has(subpackage)) {
                        queue.push(subpackage);
                    }
                });
            }
        }

        let promise = new Promise((resolve, reject) => {
            if (toLoad.size === 0) {
                resolve('No new packages to load');
            }

            pyodide.monitorRunDependencies = (n) => {
                if (n === 0) {
                    toLoad.forEach((package) => loadedPackages.add(package));
                    delete pyodide.monitorRunDependencies;
                    const packageList = Array.from(toLoad.keys()).join(', ');
                    resolve(`Loaded ${packageList}`);
                }
            };

            toLoad.forEach((package) => {
                let script = document.createElement('script');
                script.src = `${baseURL}${package}.js`;
                script.onerror = (e) => {
                    reject(e);
                };
                document.body.appendChild(script);
            });

            // We have to invalidate Python's import caches, or it won't
            // see the new files. This is done here so it happens in parallel
            // with the fetching over the network.
            window.pyodide.runPython(
                'import importlib as _importlib\n' +
                    '_importlib.invalidate_caches()\n');
        });

        return promise;
    };

    ////////////////////////////////////////////////////////////
    // Loading Pyodide
    let wasmURL = `${baseURL}pyodide.asm.wasm`;
    let Module = {};
    window.Module = Module;

    // TODO: Revert to code below when https://bugzil.la/1470182 is fixed
    // let wasm_promise = WebAssembly.compileStreaming(fetch(wasmURL));
    let wasm_promise = fetch(wasmURL)
        .then(res => res.arrayBuffer())
        .then(buf => WebAssembly.compile(buf));
    Module.instantiateWasm = (info, receiveInstance) => {
        wasm_promise
            .then(module => WebAssembly.instantiate(module, info))
            .then(instance => receiveInstance(instance));
        return {};
    };
    Module.filePackagePrefixURL = baseURL;
    Module.postRun = () => {
        delete window.Module;
        resolve();
    };

    let data_script = document.createElement('script');
    data_script.src = `${baseURL}pyodide.asm.data.js`;
    data_script.onload = (event) => {
        let script = document.createElement('script');
        script.src = `${baseURL}pyodide.asm.js`;
        script.onload = () => {
            window.pyodide = pyodide(Module);
            window.pyodide.loadPackage = loadPackage;
        };
        document.head.appendChild(script);
    };

    document.head.appendChild(data_script);

});
languagePluginLoader
