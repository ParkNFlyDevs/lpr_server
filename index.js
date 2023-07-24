const express = require('express');
const app = express()
const port = 3000
const cors = require('cors');
const { Connection, Protocol, UserAccounts } = require("axis-configuration")
const { Snapshot } = require("axis-snapshot");
const QrCode = require('qrcode-reader')
const Quagga = require('@ericblade/quagga2')
const Jimp = require("jimp");
var MjpegCamera = require('mjpeg-camera');
const dbr = require('barcode4nodejs');
dbr.initLicense("t0072oQAAABn5LXfc62RkQOfHj+QpDV/atAt/iiWMyAoeUZyv66RC1xO4eNvqSOM0d9fLmvmims+5vvY//0ib1iNaVoidzLPYFCJR;t0072oQAAADqW0gMBP0jx9eW8IA9q5lV2lvPeV2FpHutKAG+azcunrCOnxMq55PkowNwrYtvsdVEAfslRJ9HEktsUP+AP008A5SLK")
//BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode/dist/";

process.title = "kiosk_cam_server"

app.use(cors());
app.use(express.json({ limit: '5mb' }))
//app.use(bodyParser.json({ limit: '500kb' }));


let cameraFeed = new MjpegCamera({
  name: 'kiosk_cam',
  url: `http://${'localhost'}/mjpg/video.mjpg`,
});

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
        if (result && result.codeResult) {
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

async function scanQR(dataUrl) {
  //dataUrl = dataUrl.split(',')[1]
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


/*app.get("/getImage", async (req, res) => {
  let ip = req.query.ip
  const connection = new Connection(Protocol.Http, ip, 80, '****', '**********');

  const snapshot = new Snapshot(connection);

  let image = await snapshot.jpeg({ compression: 20, rotation: 180 })
  console.log(Buffer.from(image).toString("base64"))
  return res.send(Buffer.from(image).toString("base64"));
});*/

app.post("/scan", async (req, res) => {
  //console.log("SCANNING")
  cameraFeed.getScreenshot(async function (err, result) {
    if (!err && result) {
      let dataUrl = result.toString('base64')

      if (dataUrl.substring(0, 4) != '/9j/') {
        res.send(false)
        return;
      }

      let code;
      //console.log(dataUrl + "\n\n\\n\n\n\n\n\n")
      try {
        dbr.decodeBase64Async(dataUrl, dbr.formats.OneD | dbr.formats.PDF417 | dbr.formats.QRCode | dbr.formats.DataMatrix | dbr.formats.Aztec, function (err, results) {
          if (results.length > 0) {
            code = results[0].value;
          }
          if (code) {
            console.log("SENDING", JSON.stringify({ "result": code.toString() }))
            res.send({ "result": code.toString() })
          } else
            res.send(false)
        })

      } catch (e) {
        console.log("?????", e)
        res.send(false)
      }
    } else {
      console.log(JSON.stringify(err))
      if (err && err.code == "ECONNREFUSED") {
        res.send("NO FEED")
      }
    }
  })

})

app.get('/startCamFeed', async (req, res) => {
  if (cameraFeed.connection)
    cameraFeed.stop()
  console.log("IP CONNECTING IS", req.query.ip)
  cameraFeed = new MjpegCamera({
    name: 'kiosk_cam',
    url: `http://${req.query.ip}/mjpg/video.mjpg`,
  });

  cameraFeed.start();

  res.sendStatus(200)

})

app.get('/frame', async (req, res) => {
  cameraFeed.getScreenshot(function (err, result) {
    if (!err) {
      console.log(result.toString('base64'))
      return res.send(result.toString('base64'));
    }
  })
})

app.get("/check", async (req, res) => {
  return res.send(200)
});



app.listen(port, async () => {
  console.log(`LPR Server Listening On Port: ${port}`);

});