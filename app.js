const plivo = require('plivo')
const app = require('express')()
const bodyParser = require('body-parser');
const port = process.env.PORT || 5010
const campaign = process.env.CAMPAIGN || 'test'
const numbers = (process.env.NUMBERS || '').split(',')
const base = process.env.BASE_URL
const callerId = process.env.CALLER_ID
const authId = process.env.PLIVO_API_ID || 'test'
const api = plivo.RestAPI({ authId, authToken: process.env.PLIVO_API_TOKEN || 'test' })
app.use(bodyParser.urlencoded({ extended: true }));
const IncomingWebhook = require('@slack/client').IncomingWebhook
const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL)
const voice = { language: 'en-GB', voice: 'MAN' }


app.post('/connect', async ({ body, query }, res) => {
  const r = plivo.Response();
  r.addSpeak(`This is the support line for the ${campaign}.`, voice)
  if (numbers[0] !== '') {
    r.addSpeak(`Transferring you to a volunteer.`, voice)
    const dial = r.addDial({ callerId, timeout: 15, action: `${base}/tried_volunteer` })
    numbers.forEach(dial.addNumber.bind(dial))
  } else {
    r.addSpeak('None of our volunteers are available right now. Please leave a short message after the beep and we will call you back.', { language: 'en-GB', voice: 'MAN' })
    r.addRecord({ maxLength: '120', playBeep: true, transcriptionType: 'auto', transcriptionUrl: `${base}/transcript` })
  }
  res.send(r.toXML());
})

app.post('/tried_volunteer', async ({ body, query }, res) => {
  const r = plivo.Response();
  if (body.DialStatus === 'completed') {
    r.addHangup()
  } else {
    r.addSpeak('None of our volunteers are available right now. Please leave a short message after the beep and we will call you back.', { language: 'en-GB', voice: 'MAN' })
    r.addRecord({ maxLength: '120', playBeep: true, transcriptionType: 'auto', transcriptionUrl: `${base}/transcript` })
  }
  res.send(r.toXML());
})

app.post('/transcript', async ({ body, query }, res, next) => {
  api.get_cdr({ call_uuid: body.call_uuid }, (err, statusCode, data) => {
    if (err) return next(err)
    console.error('transcription: ', body.transcription)
    let text = `From: ${data.from_number} at ${data.answer_time}\nMessage: ${body.transcription}\n<https://media.plivo.com/v1/Account/${authId}/Recording/${body.recording_id}.mp3|Listen>`
    webhook.send({ text }, err => {
      if (err) return next(err)
      res.sendStatus(200);
    })
  })
})

app.post('/hangup', ({ body, query }, res) => {
  res.sendStatus(200)
})

app.listen(port, () => console.log('App running on port', port))
