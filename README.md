Adds a custom field to JIRA tickets that do not already have them upon creation or updation of that issue.

For integration with some plugins such as Plastic SCM, the plugin relies on a custom field which may not be present on all issues.
This can happen regularly, since JIRA will only add a custom field to an issue if that issue is edited in a view in which the custom field is enabled. If the issue existed before the custom field, or the issue is created from a view/form that doesn't include the custom field then the field will be missing from the issue.
Similarly, if the field is empty then JIRA considers it to not be required, and removes it from the issue.

This plugin will look for the presence of a particular field (defined in config/jira.js) and if it's missing, will set it's value to ' ' (a single space) to force JIRA to add the field to the issue.


To install:
* Add a custom field to JIRA, and then enter it's field id into config/jira.js in the format "customfield_<id of your new field>"
* Publish this sails app somewhere accessible to the interpipes, and install it with `npm install`, or publish it to heroku which will install & run it automagically
* Start the app with `npm start --prod` or use something like forever to ensure the process keeps running
* To install an application that's not published to the Marketplace, you need to enable development mode on your JIRA instance by doing the following:
* As an adminstrator, click on the cog in the top right corner and go to "Add-ons"
* From the left, select "Manage add-ons"
* Scroll to the bottom of the add-on list and select "Manage add-ons"
* Enable development mode and click apply
* Now install the app by clicking "Upload add-on" at the top of the add-on list
* Enter the public https url to your application, followed by 'atlassian-connect.json' and then click Upload, for example: https://my-jira-plugin.transmedia.group/atlassian-connect.json
* Your app should now be ready, try editing an issue that should contain the custom field, and then refresh the issue to double check everything is working