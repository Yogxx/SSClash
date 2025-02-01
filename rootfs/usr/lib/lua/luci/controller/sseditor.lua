module("luci.controller.sseditor", package.seeall)
function index()
entry({"admin","services","ssclash","sseditor"}, template("sseditor"), _("Editor"), 15).leaf=true
end
