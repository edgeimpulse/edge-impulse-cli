// eslint-disable-next-line no-console

window.CameraLiveView = async () => {

    const els = {
        title: document.querySelector('#header-row h1'),
        cameraContainer: document.querySelector('#capture-camera .capture-camera-inner'),
        cameraImg: document.querySelector('#capture-camera img'),
        timePerInference: document.querySelector('#time-per-inference'),
        imageClassify: {
            row: document.querySelector('#image-classification-conclusion'),
            text: document.querySelector('#image-classification-conclusion .col'),
        },
        views: {
            loading: document.querySelector('#loading-view'),
            captureCamera: document.querySelector('#capture-camera'),
        },
        resultsTable: document.querySelector('#results-table'),
        resultsThead: document.querySelector('#results-table thead tr'),
        resultsTbody: document.querySelector('#results-table tbody'),
    };

    const colors = [
        '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#42d4f4', '#f032e6', '#fabed4',
        '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3',
    ];
    let colorIx = 0;
    const labelToColor = { };

    function switchView(el) {
        for (let k of Object.keys(els.views)) {
            els.views[k].style.display = 'none';
        }
        el.style.display = '';
    }

    // Here is how we connect back to the server
    const socket = io.connect(location.origin);
    socket.on('connect', () => {
        socket.emit('hello');
    });

    socket.on('hello', (opts) => {
        els.title.textContent = opts.projectName;

        switchView(els.views.captureCamera);
    });

    socket.on('image', (opts) => {
        // we get corrupt frames sometimes, need to check if the image
        // is actually valid...
        let img = new Image();
        img.onload = () => {
            els.cameraImg.src = opts.img;
        };
        img.onerror = () => {
            console.warn('Corrupt JPG frame');
        };
        img.src = opts.img;
    });

    let isFirstClassification = true;
    let inferenceIx = 0;

    socket.on('classification', (opts) => {
        let result = opts.result;

        els.timePerInference.textContent = opts.timeMs;

        console.log('classification', opts.result, opts.timeMs);

        if (result.classification) {
            if (isFirstClassification) {
                for (let ix = 0; ix < Object.keys(result.classification).length; ix++) {
                    const key = Object.keys(result.classification)[ix];

                    let th = document.createElement('th');
                    th.scope = 'col';
                    th.classList.add('px-0', 'text-center');
                    th.textContent = th.title = key;
                    els.resultsThead.appendChild(th);
                }

                els.resultsTable.style.display = '';
                isFirstClassification = false;
            }

            els.imageClassify.row.style.display = '';

            let conclusion = 'uncertain';
            let highest = Math.max(...Object.values(result.classification));

            for (let k of Object.keys(result.classification)) {
                if (result.classification[k] >= 0.55) {
                    conclusion = k + ' (' + result.classification[k].toFixed(2) + ')';
                }
            }

            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            td1.textContent = (++inferenceIx).toString();
            tr.appendChild(td1);
            for (let k of Object.keys(result.classification)) {
                let td = document.createElement('td');
                td.classList.add('text-center');
                td.textContent = result.classification[k].toFixed(2);
                if (result.classification[k] === highest) {
                    td.style.fontWeight = 600;
                }
                tr.appendChild(td);
            }
            tr.classList.add('active');
            setTimeout(() => {
                tr.classList.remove('active');
            }, 200);
            if (els.resultsTbody.firstChild) {
                els.resultsTbody.insertBefore(tr, els.resultsTbody.firstChild);
            }
            else {
                els.resultsTbody.appendChild(tr);
            }

            // keep max n rows
            if (els.resultsTbody.childElementCount >= 100) {
                els.resultsTbody.removeChild(els.resultsTbody.lastChild);
            }

            els.imageClassify.text.textContent = conclusion;
        }
        else if (result.bounding_boxes) {
            for (let bx of Array.from(els.cameraContainer.querySelectorAll('.bounding-box-container'))) {
                bx.parentNode?.removeChild(bx);
            }

            let factor = els.cameraImg.naturalHeight / els.cameraImg.clientHeight;

            for (let b of result.bounding_boxes.filter(bb => bb.value >= 0.5)) {
                let bb = {
                    x: b.x / factor,
                    y: b.y / factor,
                    width: b.width / factor,
                    height: b.height / factor,
                    label: b.label,
                    value: b.value
                };

                if (!labelToColor[bb.label]) {
                    labelToColor[bb.label] = colors[colorIx++ % colors.length];
                }

                let color = labelToColor[bb.label];

                let centerX = bb.x + (bb.width / 2);
                let centerY = bb.y + (bb.height / 2);

                let el = document.createElement('div');
                el.classList.add('bounding-box-container');
                el.style.position = 'absolute';
                el.style.border = 'solid 3px ' + color;
                el.style.borderRadius = '10px';
                el.style.width = 20 + 'px';
                el.style.height = 20 + 'px';
                el.style.left = (centerX - 10) + 'px';
                el.style.top = (centerY - 10) + 'px';

                let label = document.createElement('div');
                label.classList.add('bounding-box-label');
                label.style.background = color;
                label.textContent = bb.label + ' (' + bb.value.toFixed(2) + ')';
                el.appendChild(label);

                els.cameraContainer.appendChild(el);
            }

            els.imageClassify.row.style.display = 'none';
        }
        if (result.grid) {
            for (let bx of Array.from(els.cameraContainer.querySelectorAll('.bounding-box-container'))) {
                bx.parentNode?.removeChild(bx);
            }

            let factor = els.cameraImg.naturalHeight / els.cameraImg.clientHeight;

            for (let b of result.grid) {
                let bb = {
                    x: b.x / factor,
                    y: b.y / factor,
                    width: b.width / factor,
                    height: b.height / factor,
                    label: b.label,
                    value: b.value
                };

                let el = document.createElement('div');
                el.classList.add('bounding-box-container');
                el.style.position = 'absolute';
                el.style.background = 'rgba(255, 0, 0, 0.5)';
                el.style.width = (bb.width) + 'px';
                el.style.height = (bb.height) + 'px';
                el.style.left = (bb.x) + 'px';
                el.style.top = (bb.y) + 'px';
                // Create tooltip element (custom variant because dataset.originalTitle
                // and el.dataset.toggle don't seem to work in this client)
                el.addEventListener('mouseenter', function(event) {
                    const tooltipEl = document.createElement('div');
                    tooltipEl.classList.add('tooltip-custom');
                    tooltipEl.textContent = `score ${b.value.toFixed(4)}`;
                    el.appendChild(tooltipEl);
                    tooltipEl.classList.add('show');
                });
                el.addEventListener('mouseleave', removeExistingTooltips);

                function removeExistingTooltips() {
                    const existingTooltips = document.querySelectorAll('.tooltip-custom');
                    existingTooltips.forEach(tooltip => {
                      tooltip.remove();
                    });
                }

                els.cameraContainer.appendChild(el);
            }

            els.imageClassify.row.style.display = 'none';
        }
    });
};
