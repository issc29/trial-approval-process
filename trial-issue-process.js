const dedent = require('dedent');

module.exports = class functions {
  constructor(github, core) {
    this.github = github;
    this.core = core;
    var myToken = core.getInput('github-token');
    var octokit = github.getOctokit(myToken)
    var payload = github.context.payload
    var functionsLib = require('actions-api-functions');

    this.functions = new functionsLib(octokit, core)
    this.trialIssueNodeID = payload.client_payload.command.resource.id
    this.pocApprove = payload.client_payload.data['Approve POC']
    this.userTriggered = payload.client_payload.command.user.login
    this.approvedUsers = core.getInput('approvedUsers')
    this.opsRepoID = core.getInput("opsRepoId")
  }

  async runTrialIssueProcess() {
    try {
      this.failIfNotApprovedUser(this.userTriggered, this.approvedUsers)
      const issueInfo = await this.functions.getIssueInfoFromNodeID(trialIssueNodeID)

      const reponame = issueInfo.repository.name
      const repoId = issueInfo.repository.id
      const orgname = issueInfo.repository.owner.login
      const issueNumber = issueInfo.number
      const currentIssueTitle = issueInfo.title
      const author = issueInfo.author.login
      const currentIssueBody = issueInfo.body
      const labels = issueInfo.labels.nodes

      this.checkIfPocApproved(this.pocApprove, this.userTriggered)

      const type = this.getType(labels)
      const pocObjectLink = this.getPOCObjectLink(currentIssueBody)
      const githubOrgs = this.getGitHubOrgs(currentIssueBody)
      const companyName = this.getCompanyName(currentIssueTitle)

      const repoLink = this.getRepoLink(orgname, reponame, issueNumber)
      const metadataInfo = { issueNodeID: this.trialIssueNodeID }
      const body = this.getBodyText(companyName, pocObjectLink, githubOrgs, author, this.userTriggered, repoLink, type, metadataInfo)
      // console.log(body)
      const title = this.getTitleText(companyName)

      console.log("Creating Issue in Ops Repo")
      const createdIssueInfo = await this.functions.createIssue(this.opsRepoID, body, title)
      // console.log(createdIssueInfo)
      const opsIssueRepoName = createdIssueInfo.createIssue.issue.repository.nameWithOwner
      const opsIssueNumber = createdIssueInfo.createIssue.issue.number

      console.log("Commenting on Existing Issue")
      await this.commentOnExistingTrialIssue(this.trialIssueNodeID, this.userTriggered, opsIssueRepoName, opsIssueNumber)
    } catch (error) {
      await this.functions.commentOnIssue(this.trialIssueNodeID, error.message)
      this.core.setFailed(error.message);
    }
  }


  checkIfPocApproved(pocApprove, userTriggered){
    if(pocApprove != "Yes") {
      throw new Error(`:wave: Trial has been denied by \`@${userTriggered}\`!`)
    }
  }

  getType(labels){
    var type = ''
    for(const label of labels) {
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

  getPOCObjectLink(body) {
    
    try { 
      var pocLink = ''
      pocLink = body.match(/.*(https:\/\/github\.lightning\.force\.com.*Proof_of_Concept.*view).*/)[1]
      return pocLink
    } catch (e) {
      throw new Error(':wave: Trial Error: Could not detect the SFDC POC Link!')
    }
  }

  getGitHubOrgs(body){
    const reGitHubOrg = /.*GitHub Organization\(s\)\*\* -(.*)/
    if(reGitHubOrg.test(body)) {
      var githubOrg = body.match(/.*GitHub Organization\(s\)\*\* -(.*)/)[1].trim()
      return githubOrg
    }
    throw new Error(':wave: Trial Error: Could not detect POC Organization to enable!')
  }

  getCompanyName(title) {
    try {
      var companyName = title.match(/\[GHAS .* Trial\]:(.*),.*/)[1]
      return companyName
    } catch (e) {
      throw new Error(':wave: Trial Error: Could not detect the Company Name!')
    }
  }


  failIfNotApprovedUser(userTriggered, approvedUsers){
    if(!this.isApprovedUser(userTriggered, approvedUsers)) {
      throw new Error(':wave: Trial Error: Not an approver!')
    }
  }

  isApprovedUser(userTriggered, approvedUsers) {
    console.log(approvedUsers)
    var approvedUsersList = approvedUsers.split(",").map(function(item) {
      return item.trim();
    });

    for (const user of approvedUsersList){
      if (user == userTriggered) {
        //console.log(`${user} : ${userTriggered}`)
        return true
      }
    }

    return false
  }

  getBodyText(companyName, pocLink, githubOrgs, author, approvedUser, repoLink, type, metadataInfo) {
    const typeText = this.getTypeText(type)
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

  getTypeText(type){
    if(type == 'Cloud') {
      return '<li>- [ ] `GHES: Server` </li><li>- [x] `GHEC: Cloud` </li><li>- [ ] `GHE: Unified (Server + EntAct)`'
    }

    return '<li>- [x] `GHES: Server` </li><li>- [ ] `GHEC: Cloud` </li><li>- [ ] `GHE: Unified (Server + EntAct)`'
  }

  getTitleText(companyName) {
    return `Enable GHAS Trial: ${companyName}`
  }

  getRepoLink(orgname, reponame, issueNumber) {
    return `${orgname}/${reponame}#${issueNumber}`
  }

  getExistingTrialComment(userTriggered, nameWithOwner, opsIssueNumber){
    return `Trial has been approved by \`@${userTriggered}\`! See ${nameWithOwner}#${opsIssueNumber} for the enablement request`
  }

  async commentOnExistingTrialIssue(issueNodeID, userTriggered, nameWithOwner, opsIssueNumber) {
    const existingTrialComment = this.getExistingTrialComment(userTriggered, nameWithOwner, opsIssueNumber)
    await this.functions.commentOnIssue(issueNodeID, existingTrialComment)

  }
}