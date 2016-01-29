var doc = document, win = window, can, gl,
    obj = {
        pos: [0, 0],
        ang: 0,
        vel: [0, 0],
        ver: [-50, -5, 50, 0, -50, 5]
    }, ter = {
        ver: [-1000, 350, 1000, 350, 1000, 400, -1000, 400]
    }, key = [65, 68, 87], act = [0, 0, 0];

function init() {
    can = doc.getElementById('can');
    try {
        gl = can.getContext('webgl') || can.getContext('experimental-webgl');
    } catch (e) {
        console.log('Error getting WebGL context:', e);
    }
    if (!gl) {
        console.log('Unable to initialize WebGL');
    } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

        // Enable alpha blending
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Enable keyboard input detection
        win.onkeydown = win.onkeyup = function (e) {
            var i = key.length, k = e.which;
            while (--i >= 0) {
                if (k == key[i]) {
                    act[i] = e.type == 'keydown' ? 1 : 0;
                    break;
                }
            }
        }

        // Enable keyboard input detection
        win.onresize = function () {
            var w = can.width = win.innerWidth,
                h = can.height = win.innerHeight;
            gl.viewport(0, 0, w, h);
        }

        win.onresize();
        run();
    }
}

function run() {
    // Only render when document has focus
    if (doc.hasFocus()) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    // Loop the run function
    requestAnimationFrame(run, can);
}

win.onload = init;