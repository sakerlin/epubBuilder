#!/usr/bin/env node
const exec = require('child-process-promise').exec
console.log('do zip -------------')
exec(`zip -r spliteFile.zip ./spliteFile`)
.then((result) => {
  let stdout = result.stdout
  let stderr = result.stderr
  console.log('stdout: ', stdout)
  console.log('stderr: ', stderr)
})
