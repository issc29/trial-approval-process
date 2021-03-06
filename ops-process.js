module.exports = class functions {
  constructor(github, core) {
    this.github = github;
    this.core = core;
    var myToken = core.getInput('github-token');
    var octokit = github.getOctokit(myToken)
    var payload = github.context.payload
    var functionsLib = require('actions-api-functions');

    this.pocProject = core.getInput('pocProjectID');
    this.functions = new functionsLib(octokit, core)
    this.opsIssueNodeID = payload.client_payload.command.resource.id
    this.numOfPOCDays = payload.client_payload.data['Trial Days']
    this.inProgressColumnID = core.getInput('inProgressColumnID');
    

  }

  async runOpsProcess() {

    try {
      // Get Issue Info
      console.log("Getting Issue Info")
      const opsIssueInfo = await this.functions.getIssueInfoFromNodeID(this.opsIssueNodeID)
      const opsMetadataInfo = this.getIssueMetadataObject(opsIssueInfo.body)
      const trialIssueNodeID = opsMetadataInfo["trialIssueNodeID"]
      const trialIssueInfo = await this.getTrialIssueInfo(trialIssueNodeID)
      const trialProjectInfo = await this.functions.getProjectInfoFromNodeID(trialIssueNodeID)
      const trialProjectCardNodes = trialProjectInfo.projectCards.nodes
      
      // Get Project cards associated with GHAS POC Issue
      var cardId = this.getProjectCard(trialProjectCardNodes)

      // Change column to In Progress
      console.log("Changing column of POC Trial Issue to In Progress")
      await this.functions.moveIssueColumn(cardId, this.inProgressColumnID)

      // Comment on POC Trial issue
      console.log("Commenting on POC Trial Issue")
      await this.functions.commentOnIssue(trialIssueNodeID, `Trial has been enabled for ${this.numOfPOCDays} days! For extensions or any other enablement requests, see the sales-operations issue. `)
  
      // Update the GHAS POC Issue body to include updated expiration
      console.log("Updating on POC Trial Issue with new Metadata")
      const expireDate = this.getExpireDate(this.numOfPOCDays)
      var updatedBody = this.getUpdateMetadataBody(trialIssueInfo.body, expireDate)
      await this.functions.updateIssueBody(trialIssueNodeID, updatedBody)

      // Comment and close Sales Ops Issue
      console.log("Commenting and closing sales-ops issue")
      await this.functions.commentOnIssue(this.opsIssueNodeID, `POC has been enabled for ${this.numOfPOCDays} days!`)
      await this.functions.updateIssueState(this.opsIssueNodeID, "CLOSED")

    } catch (error) {
      await this.functions.commentOnIssue(this.opsIssueNodeID, error.message)
      this.core.setFailed(error.message);
    }
  }


  getUpdateMetadataBody(body, expireDate) {
    var updatedBody = body
    var metadataObject = this.functions.getMetadataObjectFromBody(body)
    if(Object.keys(metadataObject).length !== 0) {
      metadataObject["END"] = expireDate
      const metadataBody = `<!-- METADATA: ${JSON.stringify(metadataObject)} -->`
      updatedBody = body.replace(/<!-- METADATA:.*?({.*}).*-->/gm, metadataBody)
    } else {
      const metadataBody = {}
      metadataBody["END"] = expireDate
      updatedBody = body + `\r\n\r\n<!-- METADATA: ${JSON.stringify(metadataBody)} -->`
    }
    return updatedBody
  }

  getExpireDate(numOfPOCDays) {
    return Date.now() + (numOfPOCDays * 24 * 3600 * 1000)
  }

  getIssueMetadataObject(body){
    return JSON.parse(body.match(/<!-- METADATA:.*?({.*}).*-->/)[1])
  }

  getProjectCard(trialProjectCardNodes){
    var cardId = ''
    for (const projectCard of trialProjectCardNodes) {
      console.log(projectCard)
      if(projectCard.project.id == this.pocProject) {
        cardId = projectCard.id
      }
    }
    
    if(cardId == '') {
      return new Error(':wave: Trial Error: Cannot find GHAS POCs Project Card associated with this issue!')
    }

    return cardId
  }

  async getTrialIssueInfo(trialIssueNodeID){
    const trialIssueInfo = await this.functions.getIssueInfoFromNodeID(trialIssueNodeID) 
    if (trialIssueInfo.body == '' || trialIssueInfo.body == undefined) {
      return new Error('Failed to get Issue Body')
    }  
    return trialIssueInfo
  }
}