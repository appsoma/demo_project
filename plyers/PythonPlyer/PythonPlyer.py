import sample_api

def logic(context,event):
	sample_api.alert( context, event, "testing 123" )
