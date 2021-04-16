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

}