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
dbr.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAyMTI0MjAzLTEwMjEyNTUyNSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21sdHMuZHluYW1zb2Z0LmNvbS8iLCJvcmdhbml6YXRpb25JRCI6IjEwMjEyNDIwMyIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NsdHMuZHluYW1zb2Z0LmNvbS8iLCJjaGVja0NvZGUiOjE4OTIyODM5Mzl9")
//BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode/dist/";

process.title = "kiosk_cam_server"

app.use(cors());
app.use(express.json({ limit: '5mb' }))
//app.use(bodyParser.json({ limit: '500kb' }));


let cameraFeed = new MjpegCamera({
  name: 'kiosk_cam',
  url: `http://${'localhost'}/mjpg/video.mjpg`,
});


app.get("/getImage", async (req, res) => {
  let ip = req.query.ip
  const connection = new Connection(Protocol.Http, ip, 80, 'root', 'pnf.12@admin');

  const snapshot = new Snapshot(connection);

  let image = await snapshot.jpeg({ compression: 20, rotation: 180 })
  console.log(Buffer.from(image).toString("base64"))
  return res.send(Buffer.from(image).toString("base64"));
});

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