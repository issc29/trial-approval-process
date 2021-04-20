const core = require('@actions/core');
const github = require('@actions/github');
const trialIssueFunctions = require('./trial-issue-process.js');
const opsIssueFunctions = require('./ops-process.js');

const runOpsProcess = core.getInput('ops');

run();

async function run() {
  const opsIssueProcess = new opsIssueFunctions(github, core)
  const trialIssueProcess = new trialIssueFunctions(github, core)
  if(runOpsProcess == 'true') {
    await opsIssueProcess.runOpsProcess(github, core)
  } else {
    await trialIssueProcess.runTrialIssueProcess(github, core)
  }
}
