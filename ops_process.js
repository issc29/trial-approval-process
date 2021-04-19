module.exports = { runOpsProcess };

const functionsLib = require('actions-api-functions');
const issueNodeID = payload.client_payload.command.resource.id


function runOpsProcess(octokit, core) {
  var functions = new functionsLib(octokit, core)

  const issueInfo = await functions.getIssueInfoFromNodeID(issueNodeID)
  const body = issueInfo.body
  const currentIssueNum = issueInfo.number
  var issueCrossRepoIssueNum
  
  try {
    issueCrossRepoIssueNum = Number(body.match(/\*\*POC Issue\*\* \|.*#(.*)/)[1])
  } catch (e) {
    core.setFailed('Failed to detect Cross Repo Issue Name!')
  }



}