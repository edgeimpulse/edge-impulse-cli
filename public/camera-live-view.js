// tslint:disable: no-console

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
        }
    };

    const colors = [
        '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#42d4f4', '#f032e6', '#fabed4',
        '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3',
    ];
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

    socket.on('classification', (opts) => {
        let result = opts.result;

        els.timePerInference.textContent = opts.timeMs;

        console.log('classification', opts.result, opts.timeMs);

        if (result.classification) {
            els.imageClassify.row.style.display = '';

            let conclusion = 'uncertain';

            for (let k of Object.keys(result.classification)) {
                if (result.classification[k] >= 0.7) {
                    conclusion = k + ' (' + result.classification[k].toFixed(2) + ')';
                }
            }

            els.imageClassify.text.textContent = conclusion;
        }
        else {
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
                    labelToColor[bb.label] = colors[0];
                    colors.splice(0, 1);
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
    });
};
