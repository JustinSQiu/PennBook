const topics = [
  "ARTS",
  "ARTS & CULTURE",
  "BLACK VOICES",
  "BUSINESS",
  "COLLEGE",
  "COMEDY",
  "CRIME",
  "CULTURE & ARTS",
  "DIVORCE",
  "EDUCATION",
  "ENTERTAINMENT",
  "ENVIRONMENT",
  "FIFTY",
  "FOOD & DRINK",
  "GOOD NEWS",
  "GREEN",
  "HEALTHY LIVING",
  "HOME & LIVING",
  "IMPACT",
  "LATINO VOICES",
  "MEDIA",
  "MONEY",
  "PARENTING",
  "PARENTS",
  "POLITICS",
  "QUEER VOICES",
  "RELIGION",
  "SCIENCE",
  "SPORTS",
  "STYLE",
  "STYLE & BEAUTY",
  "TASTE",
  "TECH",
  "THE WORLDPOST",
  "TRAVEL",
  "WEDDINGS",
  "WEIRD NEWS",
  "WELLNESS",
  "WOMEN",
  "WORLD NEWS",
  "WORLDPOST"
];
var interestList = [];

document.addEventListener('DOMContentLoaded', () => {    
	console.log(interestList);
	for(const t of topics){
		if(!interestList.includes(t)){
			$('#interest-selector').append('<sl-menu-item id="interest-add-'+t+'" value="'+t+'">'+t+'</sl-menu-item>');
			$('<sl-tag style="transition: var(--sl-transition-medium) opacity; padding-right: 5px; padding-bottom: 5px; display:none" id="interests-'+t+'" size="medium" removable>'+t+'</sl-tag>').insertBefore('#interest-selector');
		}
		else{
			$('#interest-selector').append('<sl-menu-item style="display:none" id="interest-add-'+t+'" value="'+t+'">'+t+'</sl-menu-item>')
			$('<sl-tag style="transition: var(--sl-transition-medium) opacity; padding-right: 5px; padding-bottom: 5px; " id="interests-'+t+'" size="medium" removable>'+t+'</sl-tag>').insertBefore('#interest-selector');
		}

		//remove as tag, add to menu
		document.getElementById('interests-'+t).addEventListener('sl-remove', event => {
            var tag2 = event.target;
            tag2.style.opacity = '0';
            setTimeout(() => (tag2.style.opacity = '1'), 2000);

            interestList = interestList.filter(function(item) {
                return item !== t;
            });
            
            document.getElementById('interest-value').value = JSON.stringify(interestList);

            document.getElementById('interest-add-'+t).style.display = '';
            document.getElementById('interests-'+t).style.display = 'none';
        });
	}

	//remove from menu, add as tag
	$('#interest-selector').bind('sl-change', function(){
		const t = document.getElementById('interest-selector').value;
		if(t==='') return;

    console.log(t);
		interestList.push(t);
		document.getElementById('interest-value').value = JSON.stringify(interestList);
    console.log(interestList);
    console.log(JSON.stringify(interestList));

		document.getElementById('interest-add-'+t).style.display = 'none';
        document.getElementById('interests-'+t).style.display = '';

        document.getElementById('interest-selector').value = document.getElementById('interest-selector').defaultValue;
	});
});