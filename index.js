const express = require('express');
const app = express()
const port = 3000
const cors = require('cors');
const { Connection, Protocol, UserAccounts } = require("axis-configuration")
const { Snapshot } = require("axis-snapshot");
const QrCode = require('qrcode-reader')
const Quagga = require('@ericblade/quagga2')
var MjpegCamera = require('mjpeg-camera');
const { Worker } = require("worker_threads");
process.title = "kiosk_cam_server"
const THREAD_COUNT = 4;
app.use(cors());
app.use(express.json({ limit: '5mb' }))
//app.use(bodyParser.json({ limit: '500kb' }));


let cameraFeed = new MjpegCamera({
  name: 'kiosk_cam',
  url: `http://${'localhost'}/mjpg/video.mjpg`,
});


/*app.get("/getImage", async (req, res) => {
  let ip = req.query.ip
  const connection = new Connection(Protocol.Http, ip, 80, '****', '**********');

  const snapshot = new Snapshot(connection);

  let image = await snapshot.jpeg({ compression: 20, rotation: 180 })
  console.log(Buffer.from(image).toString("base64"))
  return res.send(Buffer.from(image).toString("base64"));
});*/

function createQRWorker(dataUrl) {
  return new Promise(function (resolve, reject) {
    const worker = new Worker("./qr_worker.js", {
      workerData: { thread_count: THREAD_COUNT, dataUrl: dataUrl },
    });
    worker.on("message", (data) => {
      resolve(data);
    });
    worker.on("error", (msg) => {
      reject(`An error ocurred: ${msg}`);
    });
  });
}

function createBarcodeWorker(dataUrl) {
  return new Promise(function (resolve, reject) {
    const worker = new Worker("./barcode_worker.js", {
      workerData: { thread_count: THREAD_COUNT, dataUrl: dataUrl },
    });
    worker.on("message", (data) => {
      resolve(data);
    });
    worker.on("error", (msg) => {
      reject(`An error ocurred: ${msg}`);
    });
  });
}

app.get('/test_worker', async (req, res) => {

})

app.post("/scan", async (req, res) => {
  cameraFeed.getScreenshot(async function (err, result) {
    console.log('got ss')
    if (!err && result) {
      let dataUrl = result.toString('base64')
      const workerPromises = [];


      if (dataUrl.substring(0, 4) != '/9j/') {
        res.send(false)
        return;
      }

      let qr, barcode;

      workerPromises.push(createQRWorker(dataUrl))
      workerPromises.push(createBarcodeWorker(dataUrl))

      try {
        const thread_results = await Promise.all(workerPromises);
        console.log(thread_results)
        qr = thread_results[0]
        barcode = thread_results[1]
        res.send(qr || barcode)
      } catch (e) {
        console.log("ERRRRRRRR", e)
      }
    } else {
      console.log(JSON.stringify(err))
      if (err?.code == "ECONNREFUSED") {
        res.send("NO FEED")
      }
    }
  })

})

app.get('/startCamFeed', async (req, res) => {
  if (cameraFeed.connection)
    cameraFeed.stop()
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