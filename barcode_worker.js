const { workerData, parentPort } = require("worker_threads");
const Quagga = require('@ericblade/quagga2')

async function scanBarcode(dataUrl) {
    return new Promise((resolve, reject) => {
        try {
            Quagga.decodeSingle({
                decoder: {
                    readers: ["code_128_reader", "code_39_reader"] // List of active readers
                },
                locate: true, // try to locate the barcode in the image
                src: 'data:image/jpg;base64,' + dataUrl, // or 'data:image/jpg;base64,' + data
            }, function (result) {
                if (result?.codeResult) {
                    console.log("result", result.codeResult.code);
                    resolve(result.codeResult.code)
                } else {
                    console.log("barcode not detected");
                    resolve(false)
                }
            });
        } catch (e) {
            console.log("BARCODE ERR:", e);
            resolve(false)
        }
    })
}


scanBarcode(workerData.dataUrl).then((res) => {
    parentPort.postMessage(res)
});