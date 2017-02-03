function checkField(request) {
    let newIssue = request.body.issue;
    let issueId = newIssue.id;
    if ( !newIssue.fields.hasOwnProperty(sails.config.jira.field) || !newIssue.fields[sails.config.jira.field] ) {
        sails.log.warn(`Issue ${issueId} (${newIssue.self}) does not have ${sails.config.jira.field}`);
        IssuesService.addField(newIssue.self, sails.config.jira.field);
    }
}

module.exports = {
    created: (req, res) => {
        res.send(200);
        checkField(req);
    },
    updated: (req, res) => {
        res.send(200);
        checkField(req);
    }
};