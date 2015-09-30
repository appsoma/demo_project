import com.appsoma.Pump.Plyer;
import org.json.simple.JSONObject;

public class DemoPlyer extends Plyer {
	public Boolean trigger( JSONObject event ) {
		return true;
	}

	public void logic( JSONObject event ) {
		
		JSONObject t = new JSONObject();
		
		String note = "mykey3 is false";
		if( event.get("mykey3") == true ) {
			note = "mykey3 is true";
		}
		
		t.put( "note", note );
		t.put( "event", event );
		
		this.trace( t );
	}
}
