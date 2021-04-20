module.exports = { runTrialIssueProcess };

const functionsLib = require('actions-api-functions');
const dedent = require('dedent');

async function runTrialIssueProcess(github, core) {
  const myToken = core.getInput('github-token');
  const octokit = github.getOctokit(myToken)
  const payload = github.context.payload
  const issueNodeID = payload.client_payload.command.resource.id
  const pocApprove = payload.client_payload.data['Approve POC']
  var functions = new functionsLib(octokit, core)
  const userTriggered = payload.client_payload.command.user.login
  var approvedUsers = core.getInput('approvedUsers')
  const opsRepoID = core.getInput("opsRepoId")

  try {
    failIfNotApprovedUser(userTriggered, approvedUsers)
    const issueInfo = await functions.getIssueInfoFromNodeID(issueNodeID)

    const reponame = issueInfo.repository.name
    const repoId = issueInfo.repository.id
    const orgname = issueInfo.repository.owner.login
    const issueNumber = issueInfo.number
    const currentIssueTitle = issueInfo.title
    const author = issueInfo.author.login
    const currentIssueBody = issueInfo.body
    const labels = issueInfo.labels.nodes

    checkIfPocApproved(pocApprove, userTriggered)

    const type = getType(labels)
    const pocObjectLink = getPOCObjectLink(currentIssueBody)
    const githubOrgs = getGitHubOrgs(currentIssueBody)
    const companyName = getCompanyName(currentIssueTitle)

    const repoLink = getRepoLink(orgname, reponame, issueNumber)
    const metadataInfo = { issueNodeID: issueNodeID }
    const body = getBodyText(companyName, pocObjectLink, githubOrgs, author, userTriggered, repoLink, type, metadataInfo)
    // console.log(body)
    const title = getTitleText(companyName)

    console.log("Creating Issue in Ops Repo")
    const createdIssueInfo = await functions.createIssue(opsRepoID, body, title)
    // console.log(createdIssueInfo)
    const opsIssueRepoName = createdIssueInfo.createIssue.issue.repository.nameWithOwner
    const opsIssueNumber = createdIssueInfo.createIssue.issue.number

    console.log("Commenting on Existing Issue")
    await commentOnExistingTrialIssue(issueNodeID, userTriggered, opsIssueRepoName, opsIssueNumber)
  } catch (error) {
    await functions.commentOnIssue(opsIssueNodeID, error.message)
    core.setFailed(error.message);
  }
}


function checkIfPocApproved(pocApprove, userTriggered){
  if(pocApprove != "Yes") {
    throw new Error(`:wave: Trial has been denied by \`@${userTriggered}\`!`)
  }
}

function getType(labels){
  var type = ''
  for(label of labels) {
    if(label.name == 'ghec') {
      type = "Cloud"
    }
    if(label.name == 'ghes') {
      type = "Server"
    }
  }

  if(!type) {
    throw new Error(':wave: Trial Error: Could not detect the Trial Type!')
  }

  return type
}

function getPOCObjectLink(body) {
  
  try { 
    var pocLink = ''
    pocLink = body.match(/.*(https:\/\/github\.lightning\.force\.com.*Proof_of_Concept.*view).*/)[1]
    return pocLink
  } catch (e) {
    throw new Error(':wave: Trial Error: Could not detect the SFDC POC Link!')
  }
}

function getGitHubOrgs(body){
  const reGitHubOrg = /.*GitHub Organization\(s\)\*\* -(.*)/
  if(reGitHubOrg.test(body)) {
    var githubOrg = body.match(/.*GitHub Organization\(s\)\*\* -(.*)/)[1].trim()
    return githubOrg
  }
  throw new Error(':wave: Trial Error: Could not detect POC Organization to enable!')
}

function getCompanyName(title) {
  try {
    var companyName = title.match(/\[GHAS .* Trial\]:(.*),.*/)[1]
    return companyName
   } catch (e) {
    throw new Error(':wave: Trial Error: Could not detect the Company Name!')
   }
}


function failIfNotApprovedUser(userTriggered, approvedUsers){
  if(!isApprovedUser(userTriggered, approvedUsers)) {
    throw new Error(':wave: Trial Error: Not an approver!')
  }
}

function isApprovedUser(userTriggered, approvedUsers) {
  console.log(approvedUsers)
  var approvedUsersList = approvedUsers.split(",").map(function(item) {
    return item.trim();
  });

  for (user of approvedUsersList){
    if (user == userTriggered) {
      //console.log(`${user} : ${userTriggered}`)
      return true
    }
  }

  return false
}

function getBodyText(companyName, pocLink, githubOrgs, author, approvedUser, repoLink, type, metadataInfo) {
  const typeText = getTypeText(type)
  return dedent `
  **Item** | **Description**
  :--: | :--
  **Client/Prospect** | ${companyName} :  [POC SFDC Link](${pocLink}) 
  **Base License Type** | ${typeText}
  **:stop_sign: Add-ons?** | <li>- [x] \`Advanced Security\`</li>
  **Admin email** | 
  **Cloud org name** | ${githubOrgs}
  **Server Org ID** | 
  **Trial/Extension Length** | 30 days
  **Additional details** | _(i.e. why does your customer need an extension)_
  **POC Issue** | ${repoLink}
  **Links** | 
  **Tag** | @${author}
  
  Approved By: \`@${approvedUser}\`
  
  ---
  **Mention:** _@github/sales-support_ _@github/revenue_ (for 👀 and 👍 on all day 46-90 requests)
  <!-- METADATA: ${JSON.stringify(metadataInfo)} -->
  `

}

function getTypeText(type){
  if(type == 'Cloud') {
    return '<li>- [ ] `GHES: Server` </li><li>- [x] `GHEC: Cloud` </li><li>- [ ] `GHE: Unified (Server + EntAct)`'
  }

  return '<li>- [x] `GHES: Server` </li><li>- [ ] `GHEC: Cloud` </li><li>- [ ] `GHE: Unified (Server + EntAct)`'
}

function getTitleText(companyName) {
  return `Enable GHAS Trial: ${companyName}`
}

function getRepoLink(orgname, reponame, issueNumber) {
  return `${orgname}/${reponame}#${issueNumber}`
}

function getExistingTrialComment(userTriggered, nameWithOwner, opsIssueNumber){
  return `Trial has been approved by \`@${userTriggered}\`! See ${nameWithOwner}#${opsIssueNumber} for the enablement request`
}

async function commentOnExistingTrialIssue(issueNodeID, userTriggered, nameWithOwner, opsIssueNumber) {
  const existingTrialComment = getExistingTrialComment(userTriggered, nameWithOwner, opsIssueNumber)
  await functions.commentOnIssue(issueNodeID, existingTrialComment)

}