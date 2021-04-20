const core = require('@actions/core');
const github = require('@actions/github');
const trialIssueProcess = require('./trial-issue-process.js');
const opsIssueProcess = require('./ops-process.js');

const runOpsProcess = core.getInput('ops');

run();

async function run() {
  if(runOpsProcess) {
    await opsIssueProcess.runOpsProcess(github, core)
  } else {
    await trialIssueProcess.runTrialIssueProcess(github, core)
  }
}
