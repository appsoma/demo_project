import com.appsoma.Pump.Plyer;
import org.json.simple.JSONObject;

public class DemoPlyer extends Plyer {
	public Boolean trigger( JSONObject event ) {
		return true;
	}

	public void logic( JSONObject eventIn ) {

		String note = "mykey3 is false";
		if( eventIn.get("mykey3") == true ) {
			note = "mykey3 is true";
		}

		JSONObject eventOut = new JSONObject();
		eventOut.put( "note", note );
		eventOut.put( "event", eventIn );

		this.trace( eventOut );
	}
}
