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
    this.pocApprove = payload.client_payload.data['Approve Trial']
    this.userTriggered = payload.client_payload.command.user.login
    this.approvedUsers = core.getInput('approvedUsers')
    this.opsRepoID = core.getInput("opsRepoId")
    this.opsLabelID = core.getInput("opsLabelID")
  }

  async runTrialIssueProcess() {
    try {
      this.failIfNotApprovedUser(this.userTriggered, this.approvedUsers)
      const issueInfo = await this.functions.getIssueInfoFromNodeID(this.trialIssueNodeID)

      const reponame = issueInfo.repository.name
      const repoId = issueInfo.repository.id
      const orgname = issueInfo.repository.owner.login
      const issueNumber = issueInfo.number
      const currentIssueTitle = issueInfo.title
      const author = issueInfo.author.login
      const currentIssueBody = issueInfo.body
      const labels = issueInfo.labels.nodes

      this.functions.checkIfPocApproved(this.pocApprove, this.userTriggered)

      const type = this.functions.getType(labels)
      const pocObjectLink = this.functions.getPOCObjectLink(currentIssueBody)
      const githubOrgs = (type == 'Cloud') ? this.functions.getGitHubOrgs(currentIssueBody) : ''
      const companyName = this.functions.getCompanyName(currentIssueTitle)

      const repoLink = this.getRepoLink(orgname, reponame, issueNumber)
      const opsIssueMetadataInfo = { trialIssueNodeID: this.trialIssueNodeID }
      const body = this.getBodyText(companyName, pocObjectLink, githubOrgs, author, this.userTriggered, repoLink, type, opsIssueMetadataInfo)
      // console.log(body)
      const title = this.getTitleText(companyName)

      console.log("Creating Issue in Ops Repo")
      const createdIssueInfo = await this.functions.createIssue(this.opsRepoID, body, title)
      // console.log(createdIssueInfo)
      const opsIssueRepoName = createdIssueInfo.createIssue.issue.repository.nameWithOwner
      const opsIssueNumber = createdIssueInfo.createIssue.issue.number
      if(this.opsLabelID) {
        await this.functions.addLabelToIssue(createdIssueInfo.createIssue.issue.id, this.opsLabelID)
      }

      console.log("Commenting on Existing Issue")
      await this.commentOnExistingTrialIssue(this.trialIssueNodeID, this.userTriggered, opsIssueRepoName, opsIssueNumber)
      
      console.log("Updating Existing Issue Metadata")
      var updatedBody = this.getUpdateMetadataBody(issueInfo.body, this.opsRepoID)
      await this.functions.updateIssueBody(this.trialIssueNodeID, updatedBody)

    } catch (error) {
      await this.functions.commentOnIssue(this.trialIssueNodeID, error.message)
      this.core.setFailed(error.message);
    }
  }

  getUpdateMetadataBody(body, opsIssueNodeID) {
    var updatedBody = body
    var metadataObject = this.functions.getMetadataObjectFromBody(body)
    if(Object.keys(metadataObject).length !== 0) {
      metadataObject["opsIssueNodeID"] = opsIssueNodeID
      const metadataBody = `<!-- METADATA: ${JSON.stringify(metadataObject)} -->`
      updatedBody = body.replace(/<!-- METADATA:.*?({.*}).*-->/gm, metadataBody)
    } else {
      const metadataBody = {}
      metadataBody["opsIssueNodeID"] = opsIssueNodeID
      updatedBody = body + `\r\n\r\n<!-- METADATA: ${JSON.stringify(metadataBody)} -->`
    }
    return updatedBody
  }

  failIfNotApprovedUser(userTriggered, approvedUsers){
    if(!this.isApprovedUser(userTriggered, approvedUsers)) {
      throw new Error(`:wave: Trial Error: ${userTriggered} is not an approver!`)
    }
  }

  isApprovedUser(userTriggered, approvedUsers) {
    // console.log(approvedUsers)
    var approvedUsersList = approvedUsers.split(",").map(function(item) {
      return item.trim();
    });

    for (const user of approvedUsersList){
      if (user.toLowerCase() == userTriggered.toLowerCase()) {
        //console.log(`${user} : ${userTriggered}`)
        return true
      }
    }

    console.log(`${userTriggered} is not an approved user! Approved Users: ${approvedUsers}`)
    return false
  }

  getBodyText(companyName, pocLink, githubOrgs, author, approvedUser, repoLink, type, metadataInfo) {
    const typeText = this.getTypeText(type)
    const orgText = this.getOrgText(type, githubOrgs)
    return dedent `
    **Item** | **Description**
    :--: | :--
    **Client/Prospect** | ${companyName} :  [POC SFDC Link](${pocLink}) 
    **Base License Type** | ${typeText}
    **:stop_sign: Add-ons?** | <li>- [x] \`Advanced Security\`</li>
    **Admin email** | 
    ${orgText}
    **Trial/Extension Length** | 30 days
    **Additional details** | _(i.e. why does your customer need an extension)_
    **POC Issue** | ${repoLink}
    **Links** | 
    **Tag** | @${author}
    
    Approved By: \`@${approvedUser}\`
    
    ---
    **Mention:** _@github/sales-support_ _@github/revenue_ (for ???? and ???? on all day 46-90 requests)
    <!-- METADATA: ${JSON.stringify(metadataInfo)} -->
    `

  }

  getTypeText(type){
    if(type == 'Cloud') {
      return '<li>- [ ] `GHES: Server` </li><li>- [x] `GHEC: Cloud` </li><li>- [ ] `GHE: Unified (Server + EntAct)`'
    }

    return '<li>- [x] `GHES: Server` </li><li>- [ ] `GHEC: Cloud` </li><li>- [ ] `GHE: Unified (Server + EntAct)`'
  }

  getOrgText(type, githubOrgs){
    if(type == 'Cloud') {
      return `**Cloud org name** | ${githubOrgs}`
    }
    return '**Server ID** | '
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