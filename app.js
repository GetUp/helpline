const plivo = require('plivo')
const app = require('express')()
const bodyParser = require('body-parser');
const port = process.env.PORT || 5010
const campaign = process.env.CAMPAIGN || 'test'
const numbers = (process.env.NUMBERS || '').split(',')
const base = process.env.BASE
const callerId = process.env.CALLER_ID
const api = plivo.RestAPI({ authId: process.env.PLIVO_API_ID || 'test', authToken: process.env.PLIVO_API_TOKEN || 'test'})
app.use(bodyParser.urlencoded({extended: true}));

app.post('/connect', async ({body, query}, res) => {
  const r = plivo.Response();
  r.addSpeak(`This is the support line for the ${campaign}. Transferring you to a volunteer.`, {language: 'en-GB', voice: 'MAN'})
  const dial = r.addDial({callerId, timeout: 15, action: `${base}/tried_volunteer`})
  numbers.forEach(dial.addNumber.bind(dial))
  res.send(r.toXML());
})

app.post('/tried_volunteer', async ({body, query}, res) => {
  const r = plivo.Response();
  if (body.DialStatus === 'completed') {
    r.addHangup()
  } else {
    r.addSpeak('None of our volunteers are available right now. Please leave a short message after the beep and we will call you back.', {language: 'en-GB', voice: 'MAN'})
    r.addRecord({maxLength: '120', playBeep: true, transcriptionType: 'auto', transcriptionUrl: `${base}/transcript`})
  }
  res.send(r.toXML());
})

app.post('/transcript', async ({body, query}, res, next) => {
  console.error(body)
  api.get_cdr({call_uuid: body.call_uuid}, (err, data) => {
    if (err) return next(err)
    console.error(err)
    console.error(data)
    res.sendStatus(200);
  })
})

app.listen(port, () => console.log('App running on port', port))
