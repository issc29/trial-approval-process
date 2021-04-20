const core = require('@actions/core');
const github = require('@actions/github');
const trialIssueProcess = require('./trial-issue-process.js');
const runOpsProcess = require('./ops-process.js');

const opsProcess = core.getInput('ops');

run();

async function run() {
  if(opsProcess) {
    await trialIssueProcess.runOpsProcess(github, core)
  } else {
    await runOpsProcess.runTrialIssueProcess(github, core)
  }
}
