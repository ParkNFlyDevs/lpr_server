const { workerData, parentPort } = require("worker_threads");
const QrCode = require('qrcode-reader')
const Jimp = require("jimp");

async function scanQR(dataUrl) {
    //dataUrl = dataUrl.split(',')[1]
    console.log("SCANNING")
    return new Promise((resolve, reject) => {
        Jimp.read(Buffer.from(dataUrl, 'base64'), function (err, img) {
            if (!err) {
                let qr = new QrCode();

                qr.callback = function (err, value) {
                    if (err) {
                        console.log("QR.ERR", err)
                        resolve(false);//console.error(err);

                        // TODO handle error
                    } else {
                        resolve(value.result);
                    }
                };

                qr.decode(img.bitmap)
            } else {
                console.log("JIMP.ERR", err, dataUrl)

                resolve(false)
            }
        })


    })
}


scanQR(workerData.dataUrl).then((res) => {
    return parentPort.postMessage(res);
});