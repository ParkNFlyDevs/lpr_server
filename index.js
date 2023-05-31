const express = require('express');
const app = express()
const port = 3000
const cors = require('cors');
const { Connection, Protocol, UserAccounts } = require("axis-configuration")
const { Snapshot } = require("axis-snapshot");
const QrCode = require('qrcode-reader')
const Quagga = require('@ericblade/quagga2')
const Jimp = require("jimp");

app.use(cors());
app.use(express.json({ limit: '5mb' }))
//app.use(bodyParser.json({ limit: '500kb' }));

async function scanBarcode(dataUrl) {
  return new Promise((resolve, reject) => {
    Quagga.decodeSingle({
      decoder: {
        readers: ["code_128_reader", "code_39_reader"] // List of active readers
      },
      locate: true, // try to locate the barcode in the image
      src: dataUrl, // or 'data:image/jpg;base64,' + data
    }, function (result) {
      if (result?.codeResult) {
        console.log("result", result.codeResult.code);
        resolve(result.codeResult.code)
      } else {
        console.log("not detected");
        resolve(false)
      }
    });
  })
}

async function scanQR(dataUrl) {
  dataUrl = dataUrl.split(',')[1]
  return new Promise((resolve, reject) => {
    Jimp.read(Buffer.from(dataUrl, 'base64'), function (err, img) {
      if (!err) {
        let qr = new QrCode();

        qr.callback = function (err, value) {
          if (err) {
            console.log(err)
            resolve(false);//console.error(err);

            // TODO handle error
          } else {
            resolve(value.result);
          }
        };

        qr.decode(img.bitmap)
      } else {
        console.log(err)
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
  let dataUrl = req.body.code

  let qr, barcode;

  try {
    qr = await scanQR(dataUrl);
    barcode = await scanBarcode(dataUrl)
    res.send(qr || barcode)
  } catch (e) {
    console.log(e)
    res.send(false)
  }

})

app.get("/check", async (req, res) => {
  return res.send(200)
});



app.listen(port, async () => {
  console.log(`LPR Server Listening On Port: ${port}`);

});