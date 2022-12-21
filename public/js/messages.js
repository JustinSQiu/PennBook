	
function isNumeric(value) {
    return /^-?\d+$/.test(value);
}




var socket = io();
	var prevRoom = undefined;
	var currRoom = undefined;
	var members_of_group = undefined;
	function sendchat(){
	
	if(isNumeric(prevRoom)){
		
		socket.emit("chat message", 
		{text:$("#sentMessage").val(), sender: prevRoom}
		);
		
		}else{
		
		socket.emit("chat message DM", 
		{text:$("#sentMessage").val(), sender: prevRoom}
		);
		}
		
		//let user = socket.request.session.userId;
		//console.log(user);
	
	}
	
	function startDM(value){
	
		socket.emit("initDM", value);
	
	}


    $(document).ready(function() {
    
    	$("#messageElts").hide()
    	$("#messagePanel").hide()
    	
    	socket.emit("join");
    	
    
    	socket.on("chat message", function(msg){
    		var messageTemp = document.createElement("li");
    		
    		messageTemp.appendChild(document.createTextNode( msg.text));
    		$("#messages").append(messageTemp);
    		
    		});
    		
    	socket.on("request_send_error", function(){
    	alert("check your requests! this user has already requested to chat with you.");
    	});

		
    	
    	socket.on("receiveDM", function(sender){
    	
    		var groupCard = "";
    		
    		groupCard += '<div class = "acceptDM '+sender+'">';
    		groupCard += '<sl-card class="card-footer"> Chat request from: ' 
                groupCard += sender;
                groupCard += '<div slot="footer"> <sl-button variant="primary" class = "startDM" value = "';
                groupCard += sender;
                groupCard+= '">Accept</sl-button></div></sl-card>';
                groupCard+="<sl-divider></sl-divider>"
               // groupCard+="</div>"

				
		var currHTML = $("#requests").html();

           $("#requests").html(currHTML+groupCard);
		   //alert($("#requests").html());
		   //alert(groupCard);
             
    		
    		
    	});
    		
    	
    		 $.post("/getDMGroup", function(data) {
   
 
    var DMCards = "";
	
    
    data =JSON.parse(data)[0].people.L
    
    for (var i = 0; i < data.length; i++) {
    
      var entry = data[i].S;
      
      var person1 = entry.split(",")[0];
      var person2 = entry.split(",")[1];
      
    
      DMCards += '<sl-card class="card-footer"> ' + person1 + " and " + person2+'<div slot="footer"> <sl-button variant="primary" class = "enterDM" value = "' + person1 + "," + person2 + '">Enter DM</sl-button></div></sl-card><sl-divider></sl-divider>';
    }

	//alert(data.length);

    
    $("#activeDMs").html(DMCards);
  });
    		


  var groups = [];
  $.post("/messageGroups", function (data) {
        	
        	//alert(JSON.parse(data));
          if(data=="no groups yet!"){

$("#groupchats").html("no groupchats yet")
return;
}
        	data = data.id.L
        	groupCard = "";
        	
            selectContents = "";
			promises = [];

			var namePromise = function(chosenId){
				var a = new Promise(function(resolve, reject){
					$.post("/getGCName/"+chosenId, function(groupName){
						//alert(groupName);
						selectContents += '<option value="'+ chosenId + '">' + chosenId + '</option>';
						groupCard += '<div class = "groupCard '+chosenId+'">'
						groupCard += '<sl-card class="card-footer' +'">' 
						groupCard += groupName;
					 //   groupCard += '<div slot="footer"> <sl-button variant="primary" class = "gcjoin ';
						groupCard += '<div slot="footer"> <sl-button variant = "primary" class = "gcjoin"';
						groupCard += ' value = "';
						groupCard += chosenId;
						groups.push(chosenId);
						groupCard+= '">Enter Chat</sl-button></div></sl-card>';
						groupCard+="<sl-divider></sl-divider>"
						groupCard += '</div>'
						resolve();
					}, 'json');
				})
				return a;

			}
			

			const doNextPromise = (d) => {
				namePromise(data[d].S)
				  .then(x => {
					d++;
					if (d < data.length)
					  doNextPromise(d)
					else
					$("#groupchats").html(groupCard);
				  })
			  }
			  doNextPromise(0);
 
            
        }, 'json');

		


  var fetchGroups = function(){
	$.post("/messageGroups", function (data) {
        	
		//alert(JSON.parse(data));
	  if(data=="no groups yet!"){

$("#groupchats").html("no groupchats yet")
return;
}
		data = data.id.L
		groupCard = "";
		
		selectContents = "";
		promises = [];

		var namePromise = function(chosenId){
			var a = new Promise(function(resolve, reject){
				$.post("/getGCName/"+chosenId, function(groupName){
					//alert(groupName);
					selectContents += '<option value="'+ chosenId + '">' + chosenId + '</option>';
					groupCard += '<div class = "groupCard '+chosenId+'">'
					groupCard += '<sl-card class="card-footer' +'">' 
					groupCard += groupName;
				 //   groupCard += '<div slot="footer"> <sl-button variant="primary" class = "gcjoin ';
					groupCard += '<div slot="footer"> <sl-button variant = "primary" class = "gcjoin"';
					groupCard += ' value = "';
					groupCard += chosenId;
					groups.push(chosenId);
					groupCard+= '">Enter Chat</sl-button></div></sl-card>';
					groupCard+="<sl-divider></sl-divider>"
					groupCard += '</div>'
					resolve();
				}, 'json');
			})
			return a;

		}
		

		const doNextPromise = (d) => {
			namePromise(data[d].S)
			  .then(x => {
				d++;
				if (d < data.length)
				  doNextPromise(d)
				else
				$("#groupchats").html(groupCard);
			  })
		  }
		  doNextPromise(0);

		
	}, 'json');
	}

	setInterval(fetchGroups,5000);
        $.post("/chatRequests", function(data) {
    // Create a string to hold the HTML for the chat request cards
    var requestCards = "";
    data =JSON.parse(data).people.L
    
	
    // Loop through the chat request data
    for (var i = 0; i < data.length; i++) {
    
      var sender = data[i].S;

      // Create a chat request card for each sender
      requestCards += '<sl-card class="card-footer"> Chat request from: ' + sender + '<div slot="footer"> <sl-button variant="primary" class = "startDM" value = "' + sender + '">Accept</sl-button></div></sl-card><sl-divider></sl-divider>';
    }

    // Insert the chat request cards into the page
    $("#requests").html(requestCards);
  });
        var fetchOnline = function(){
       
          $.post("/getFriendsOnline", function (data) {
        	
			//alert(data);
        	
        	friendCard = "";
        	
            selectContents = "";
            for (var i = 0; i < data.length; i++) {
                var friend = data[i];
                
               
                friendCard += '<sl-card class="card-footer">' 
                friendCard += friend;
                friendCard += '<div slot="footer"> <sl-button variant="primary" class = "initiatedm" value = "';
                friendCard += friend;
                friendCard+= '" onclick = "return startDM(this.value);">Initiate DM</sl-button></div></sl-card>';
                friendCard+="<sl-divider></sl-divider>"
                
          
            }
            
          if(friendCard==""){
          	friendCard+="no friends online right now. invite them over!";
          }
         
            $("#dmList").html(friendCard);
            
        }, 'json');
        }
          setInterval(fetchOnline, 5000);
          
           $.post("/getFriendsOnline", function (data) {
        	
        	
        	friendCard = "";
        	
            selectContents = "";
            for (var i = 0; i < data.length; i++) {
                var friend = data[i];
                
               
                friendCard += '<sl-card class="card-footer">' 
                friendCard += friend;
                friendCard += '<div slot="footer"> <sl-button variant="primary" class = "initiatedm" value = "';
                friendCard += friend;
                friendCard+= '" onclick = "return startDM(this.value);">Initiate DM</sl-button></div></sl-card>';
                friendCard+="<sl-divider></sl-divider>"
                
          
            }
            if(friendCard==""){
            	friendCard+="no friends online right now :(";
            }
          
         
            $("#dmList").html(friendCard);
              }, 'json');
          
        //TODO: FIX. MAYBE DEFINE NEW FUNCTION?? 
        //okay probably fixed now
         $.post("/getFriends", function (data) {
            selectContents = "";
            
            for (var i = 0; i < data.length; i++) {
                var friendUser = data[i].S;
                selectContents += '<option value="'+ friendUser + '">' + friendUser + '</option>';
            	
            }
            $("#myFriends").html(selectContents);
        }, 'json');
        
      
        
        
        //gcjoin functionality
        $("#addFriend").click(function(){
		        	

			var cardHTML = "";
			cardHTML +='<sl-card class="card-basic" style = "width: px">';
			cardHTML += $("#myFriends").val();
			cardHTML+='</sl-card>'
			$("#memberList").append(cardHTML);
			//alert($("#memberList"))
	        		socket.emit("addFriend", {id:prevRoom, friend:$("#myFriends").val()});


	        	});
        
        $(document).on('click', '.gcjoin', function(e) {
		     const drawer = document.querySelector('#chatDrawer');
		     drawer.show();
			 $("#Rename").show();
	        $("#messageElts").show()
	        $("#messagePanel").show()
	        $("#addFriend").show()
	        $("#addFriendDM").hide();
		        
		        
		       
	        	
	        	
				socket.emit("roomChange", {id:$(this).val(), prevId: prevRoom})
	        	
	            prevRoom =$(this).val();
	            $("#messages").empty();
	            
	            $.post("/currMembersOfRoom", {id:$(this).val()}, function(data){
	           
		            data = data.L;
		            members_of_group = [];
		            
		            var optHTML = "";
					var cardHTML = "";
		            for(var i = 0; i<data.length; i++){
		            	optHTML += '<option value="'+ data[i].S + '">' + data[i].S + '</option>';
						cardHTML+= '<sl-card class="card-basic" style = "width: px">'
						cardHTML+=data[i].S
						cardHTML+='</sl-card>'
						
						
					  
						members_of_group.push(data[i].S)            
		            }
		            
		         //   $("#currMembers").html(optHTML);
					$("#memberList").html(cardHTML);

					$.post("/getFriends", function (data) {
						selectContents = "";
						
						for (var i = 0; i < data.length; i++) {
							var friendUser = data[i].S;
							if(!members_of_group.includes(friendUser)){
								selectContents += '<option value="'+ friendUser + '">' + friendUser + '</option>';
							
							}
							
						}
						$("#myFriends").html(selectContents);
						
					}, 'json');
	            
	            }, 'json');

				
	            
	           
	             
	            $.post("/messageContents", {id:$(this).val()}, function(data){
	                
	                for (var i = 0; i < data.length; i++) {
	                    var messageFrom = data[i].from.S;
	                    var message = data[i].message.S;
	                    var messageTemp = document.createElement("li");
	                    var actualMessage = messageFrom+": "+message;
	                    
	                   
	                    messageTemp.appendChild(document.createTextNode(actualMessage))
	                    $("#messages").append(messageTemp);
	                       }
	                       
	               
	            }, 'json');
	            
	            
	            $("#leaveRoomButton").remove()
				var button = $('<button id = "leaveRoomButton">Leave Room</button>');

				button.click(function() {
					socket.emit("leave room", id);
					 const drawer = document.querySelector('#chatDrawer');
				drawer.hide();
					$(".groupCard."+id).remove();
				   $("#messageElts").hide()
				   $("#messagePanel").hide()
				   $("#addFriend").hide()
				   $("#addFriendDM").hide();
				   prevRoom = undefined;
				   
					   
					
					 $(this).remove();
				   });
				var id = $(this).val();

				$("#GCName").remove();
				var renameButton = $('<sl-input name = "textVal" id = "GCName" label = "Rename the Group" style = "width: 20vw;">');
			
				$("#Configurations").append(button);

				$("#Rename").append(renameButton);

				const input = document.getElementById("GCName");
				const alert = document.querySelector('sl-alert');

						input.addEventListener('keydown', event => {
						if (event.key === 'Enter') {
							event.preventDefault();
							changeName(input);
							alert.toast();

							return changeName(input);
						} 
						});
				
			
	            
		});
		
		
		var changeName = function(elt){

			
			
			//alert("/changeName/"+elt.value+"/"+prevRoom)
			
			
			
			$.post("/changeName/"+elt.value+"/"+prevRoom, function(data){});

		}
		socket.on("DM accepted", function(members){
		
			
				Card = "";
             	Card += '<sl-card class="card-footer">' 
                Card += members[0]+" and "+members[1];
                Card += '<div slot="footer"> <sl-button variant="primary" class = "enterDM" value = "';
                Card += members[0]+","+members[1];
                Card+= '">Enter DM</sl-button></div></sl-card>';
               	Card+="<sl-divider></sl-divider>"
                
          		$("#activeDMs").append(Card);
		});
		
		 $(document).on('click', '.startDM', function(e){
		 	
		 	
		 	$(this).attr("disabled",true);
		 	socket.emit("startDM",$(this).val());
		 	$(".acceptDM."+$(this).val()).remove();
		 	e.preventDefault();
		 	
		 });
		 
		 
		   
		   
		var curr_dm_id_list = [];
        $("#addFriendDM").click(function(){
        	
        	
    		//socket.emit("addFriend", {id:$(this).val(), friend:$("#myFriends").val()});
    		var inp = curr_dm_id_list;

    		inp.push($("#myFriends").val());
    		socket.emit("startGC",inp);
    	});
 
		 $(document).on('click', '.enterDM', function(e){
		 

			

			$("#leaveRoomButton").remove()
			$("#Rename").hide();
		 
		 	id_list = $(this).val().split(",");
		 	curr_dm_id_list = id_list;	

			 $.post("/getFriends", function (data) {
				selectContents = "";
				
				for (var i = 0; i < data.length; i++) {
					var friendUser = data[i].S;
					if(!id_list.includes(friendUser)){
						selectContents += '<option value="'+ friendUser + '">' + friendUser + '</option>';
					
					}
					
				}
				$("#myFriends").html(selectContents);
			}, 'json');
		 		
		 		id = id_list[0]+id_list[1];
		 		const drawer = document.querySelector('#chatDrawer');
		     drawer.show();
		    
	        $("#messageElts").show()
	        $("#messagePanel").show()
	        $("#addFriend").hide();
	        $("#addFriendDM").show();
		   
			
	        	
	        	
				socket.emit("roomChange", {id:id, prevId: prevRoom})
	        	
	            prevRoom = id;
	            
	            
	           
	            $("#messages").empty();
	          
	          	
	            $.post("/DMContents", {id:id}, function(data){
	                
	                 var j = 0;
	                for (var i = 0; i < data.length; i++) {
	                j++
	                    var messageFrom = data[i].from.S;
	                    
	                    var message = data[i].message.S;
	                    var messageTemp = document.createElement("li");
	                     var actualMessage = messageFrom+": "+message;
	                    messageTemp.appendChild(document.createTextNode(actualMessage))
	                    $("#messages").append(messageTemp);
	                       }
	                 
	                       
	               
	            }, 'json');

				var cardHTML = "";
				cardHTML+= '<sl-card class="card-basic" style = "width: px">';
				cardHTML+=id_list[0];
				cardHTML+='</sl-card>';

				cardHTML+= '<sl-card class="card-basic" style = "width: px">';
				cardHTML+=id_list[1];
				cardHTML+='</sl-card>';

				$("#memberList").html(cardHTML);
	            
	            
	     
		 	
		 	});
			
        
      
        
        
        
     
        });
        
       
    
