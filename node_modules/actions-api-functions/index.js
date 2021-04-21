module.exports = class functions {
  constructor(octokit, core) {
    this.octokit = octokit;
    this.core = core;
  }

  async commentOnIssue(issueID, comment) {
    const addCommentMutation = `mutation addComment($issueId: ID!, $commentBody: String!){ 
      addComment(input:{subjectId: $issueId , body: $commentBody}) {
        commentEdge {
          node {
            id
          }
        }
        }
      }`;

    const variables = {
      issueId: issueID,
      commentBody: comment,
    }
    const result = await this.octokit.graphql(addCommentMutation, variables)
    if (!result) {
      this.core.setFailed('commentOnIssue GraphQL request failed')
    } 

    return result
  }


  async getIssueInfo(issueID) {
    const getIssueInfoQuery = `query($issueId: ID!) { 
      node(id:$issueId) {
        ... on Issue {
          title,
          number
        }
      }
    }`;

    const variables = {
      issueId: issueID
    }
    const result = await this.octokit.graphql(getIssueInfoQuery, variables)
    if (!result) {
      this.core.setFailed('getIssueInfo GraphQL request failed')
    } 
    else {
      console.log(`Title: ${result.node.title}`)
    } 
    return result.node
  }

  async getIssueInfoFromNodeID(issueNodeID) {
    const getIssueInfoQuery = `query($issueNodeID: ID!) { 
        node(id: $issueNodeID)
        {
          ... on Issue {
            repository{
              name,
              owner {
                login
              },
              id
            },
            number,
            title,
            author{
              login
            },
            body,
            labels(first:15){
              nodes{
                name
              }
            }
          }
        }
      }`;

    const variables = {
      issueNodeID: issueNodeID
    }
    const result = await this.octokit.graphql(getIssueInfoQuery, variables)
    if (!result) {
      this.core.setFailed('getIssueInfoFromNodeID GraphQL request failed')
    } 
    else {
      console.log(`Issue Number: ${result.node.number}`)
    } 
    return result.node
  }

  async getProjectInfoFromNodeID(issueNodeID) {
    const getProjectInfoQuery = `query($issueNodeID: ID!) { 
        node(id: $issueNodeID)
        {
          ... on Issue {
            projectCards {
              nodes{
                id,
                project{
                  id
                }
              }
            }
          }
        }
      }`;

    const variables = {
      issueNodeID: issueNodeID
    }
    const result = await this.octokit.graphql(getProjectInfoQuery, variables)
    if (!result) {
      this.core.setFailed('getProjectInfoFromNodeID GraphQL request failed')
    } 
    else {
      console.log(`getProjectInfoFromNodeID GraphQL completed`)
    } 
    return result.node
  }

  async addLabelToIssue(issueID, labelID) {
    const addLabelMutation = `mutation addLabel($issueId: ID!, $labelId: [ID!]!){ 
      addLabelsToLabelable(input:{labelIds:$labelId, labelableId:$issueId}){
        labelable {
          ... on Issue {
            id
          }
        }
      }
    }`;

    const variables = {
      issueId: issueID,
      labelId: labelID
    }
    const result = await this.octokit.graphql(addLabelMutation, variables)
    if (!result) {
      this.core.setFailed('addLabelToIssue GraphQL request failed')
    } 
    else {
      console.log(`Added Label: nodeId: ${result.addLabelsToLabelable.labelable.id}`)
    } 
    return result.addLabelsToLabelable.labelable
  }

  async removeLabelFromIssue(issueID, labelID) {
    const removeLabelMutation = `mutation removeLabel($issueId: ID!, $labelId: [ID!]!){ 
      removeLabelsFromLabelable(input:{labelIds:$labelId, labelableId:$issueId}){
        labelable {
          ... on Issue {
            id
          }
        }
      }
    }`;

    const variables = {
      issueId: issueID,
      labelId: labelID
    }
    const result = await this.octokit.graphql(removeLabelMutation, variables)
    if (!result) {
      this.core.setFailed('removeLabelFromIssue GraphQL request failed')
    } 
    else {
      console.log(`Removed Label: nodeId: ${result.removeLabelsFromLabelable.labelable.id}`)
    } 
    return result.removeLabelsFromLabelable.labelable
  }

  async getIssueLastTimelineEvent(projectColumn) {
    const getLastTimelineEvent = `query($projectColumnID: ID!) { 
      node(id: $projectColumnID) { 
        ... on ProjectColumn { 
          name
          cards  {
            nodes {
              content {
                ... on Issue {
                  url
                  id
                  timelineItems(last: 1, itemTypes: MOVED_COLUMNS_IN_PROJECT_EVENT) {
                    nodes {
                      __typename
                      ... on MovedColumnsInProjectEvent {
                        previousProjectColumnName
                        createdAt
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;

    const variables = {
      projectColumnID: projectColumn,
      headers: {
        Accept: `application/vnd.github.starfox-preview+json`
      }
    }
    const result = await this.octokit.graphql(getLastTimelineEvent, variables)
    if (!result) {
      this.core.setFailed('getIssueLastTimelineEvent GraphQL request failed')
    } 
    else {
      console.log(`Got Issue Last Timeline Event`)
    } 
    return result
  }

  async getIssueInfoFromProjectCard(projectCardID) {
    const getIssueInfoFromProjectCardQuery = `query($projectCardID: ID!) { 
      node(id:$projectCardID) {
        ... on ProjectCard{
          content{
            ... on Issue{
              id,
              repository {
                name,
                owner {
                  login
                }
              },
              number,
              title,
              author{
                login
              },
              body,
              labels(first:15) {
                nodes{
                  name
                }
              }
            }
          }
        }
      }
    }`;

    const variables = {
      projectCardID: projectCardID
    }
    const result = await this.octokit.graphql(getIssueInfoFromProjectCardQuery, variables)
    if (!result) {
      this.core.setFailed('getIssueInfoFromProjectCardQuery GraphQL request failed')
    } 
    else {
      console.log(`getIssueInfoFromProjectCardQuery GraphQL request succeeded`)
    } 
    return result.node
  }

  async createIssue(repositoryId, body, title) {
    const createIssueMutation = `mutation createIssue($repositoryId: ID!, $body: String!,  $title: String!){ 
      createIssue(input:{body:$body, title:$title, repositoryId:$repositoryId}) {
        issue{
          id,
          number,
          title,
          repository{
            nameWithOwner
          }
        }
      }
    }`;

    const variables = {
      repositoryId: repositoryId,
      body: body,
      title: title
    }
    const result = await this.octokit.graphql(createIssueMutation, variables)
    if (!result) {
      this.core.setFailed('createIssue GraphQL request failed')
    } 

    return result
  }


  async moveIssueColumn(cardId, columnId) {
    const setIssueColumnToInProgress = `mutation moveProjectCard($cardId: ID!, $columnId: ID!){ 
      moveProjectCard(input:{cardId:$cardId,columnId:$columnId}) {
        clientMutationId
        cardEdge{
          node{
            column{
              id
            }
          }
        }
      }
     }`;

    const variables = {
      cardId: cardId,
      columnId: columnId
    }
    const result = await this.octokit.graphql(setIssueColumnToInProgress, variables)
    if (!result) {
      this.core.setFailed('moveIssueColumn GraphQL request failed')
    } 
    else {
      console.log(`Move Column GraphQL completed`)
    } 
    return result
  }

  async updateIssueBody(issueID, comment) {
    const UpdateIssueBodyMutation = `mutation($issueID: ID!, $body: String!){
      updateIssue(input:{id:$issueID, body: $body}){
          issue{
              id
          }
      }
  }`;

    const variables = {
      issueId: issueID,
      body: comment,
    }
    const result = await this.octokit.graphql(UpdateIssueBodyMutation, variables)
    if (!result) {
      this.core.setFailed('UpdateIssueBody GraphQL request failed')
    } 

    return result
  }

  async updateIssueState(issueID, state) {
    state = state.toUpperCase()

    const UpdateIssueStateMutation = `mutation($issueID: ID!, $state: IssueState!){
      updateIssue(input:{id:$issueID, state: $state}){
          issue{
              id
          }
      }
  }`;

    const variables = {
      issueId: issueID,
      state: state,
    }
    const result = await this.octokit.graphql(UpdateIssueStateMutation, variables)
    if (!result) {
      this.core.setFailed('updateIssueState GraphQL request failed')
    } 

    return result
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

  getRegion(labels, regionLabels) {
    var region = ''
    for(const label of labels) {
      if(regionLabels.includes(label.name)) {
        region = label.name
      }
    }

    if(!region) {
      throw new Error(':wave: Trial Error: Could not detect the Region Label!')
    }

    return region
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
      if(githubOrg != '`replace_with_GitHub_org`' && githubOrg != '') {
        return githubOrg.trim()
      }
    }
    throw new Error(':wave: Trial Error: Could not detect POC Organization to enable!')
  }

  getCompanyName(title) {
    try {
      var companyName = title.match(/\[GHAS .* Trial\]:(.*),.*/)[1]
      return companyName.trim()
    } catch (e) {
      throw new Error(':wave: Trial Error: Could not detect the Company Name!')
    }
  }
}