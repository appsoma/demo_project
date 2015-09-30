def logic(context,event):
	event["pytime2"] = time.time()
	context.trace( event )
