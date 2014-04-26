//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//Utility Functions:

function randomfloat(min,max)
{
    return Math.random()*(max-min+1)+min;
}

function randomint(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function randomnormal(mean,stdev)
{
  var unscaled = Math.cos(2 * Math.PI * Math.random()) * Math.sqrt(-2 * Math.log(Math.random()))
  var scaled = unscaled*stdev + mean;
  return  scaled
    //Is this right? -JE
}

function initArray(length, value) {
    var arr = [], i = 0;
    arr.length = length;
    while (i < length) { arr[i++] = value; }
    return arr;
}

function cap(input){
        if (input<0) {return 0};
        if (input>1) {return 1};
        return input;
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Global simulation configuration:

config = new Object(); 
config.INPUTSIZE = 25;
config.OUTPUTSIZE =  9;
config.NUMEYES = 4;
config.BRAINSIZE= 200;
config.CONNS = 4;
config.WIDTH = 6000;  //width and height of simulation
config.HEIGHT = 3000;
config.WWIDTH = 1600;  //window width and height
config.WHEIGHT = 900;
config.CZ = 50; //cell size in pixels, for food squares. Should divide well into Width Height
config.NUMBOTS=70; //initially, and minimally
config.BOTRADIUS=10; //for drawing
config.BOTSPEED= 0.3;
config.SPIKESPEED= 0.005; //how quickly can attack spike go up?
config.SPIKEMULT= 1; //essentially the strength of every spike impact
config.BABIES=2; //number of babies per agent when they reproduce
config.BOOSTSIZEMULT=2; //how much boost do agents get? when boost neuron is on
config.REPRATEH=7; //reproduction rate for herbivores
config.REPRATEC=7; //reproduction rate for carnivores
config.DIST= 150;		//how far can the eyes see on each bot?
config.METAMUTRATE1= 0.002; //what is the change in MUTRATE1 and 2 on reproduction? lol
config.METAMUTRATE2= 0.05;
config.FOODINTAKE= 0.002; //how much does every agent consume?
config.FOODWASTE= 0.001; //how much food disappears if agent eats?
config.FOODMAX= 0.5; //how much food per cell can there be at max?
config.FOODADDFREQ= 15; //how often does random square get to full food?
config.FOODTRANSFER= 0.001; //how much is transferred between two agents trading food? per iteration
config.FOOD_SHARING_DISTANCE= 50; //how far away is food shared between bots?
config.TEMPERATURE_DISCOMFORT = 0; //how quickly does health drain in non-preferred temperatures (0= disabled. 0.005 is decent value)
config.FOOD_DISTRIBUTION_RADIUS=100; //when bot is killed, how far is its body distributed?
config.REPMULT = 5; //when a body of dead animal is distributed, how much of it goes toward increasing birth counter for surrounding bots?

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//The Brain:

function Box(){
this.w = initArray(config.CONNS,0)
this.id = initArray(config.CONNS,0)
this.notted = initArray(config.CONNS,0)

for (var i=0;i<config.CONNS;i++) {
    this.w[i] = randomfloat(0.1,2);
    this.id[i] = randomint(0,config.BRAINSIZE);
    if (randomfloat(0,1)<0.2) {
    this.id[i] = randomint(0,config.INPUTSIZE); //20% of the brain AT LEAST should connect to input.
    }
    this.notted[i] = randomfloat(0,1)<0.5;
   }

  	this.type = (randomfloat(0,1)>0.5)?(0):(1);
    this.kp = randomfloat(0.8,1);
    this.bias = randomfloat(-1,1);

    this.out = 0;
    this.target = 0;
    return this;
}

DWRAONBrain = new Object();

DWRAONBrain.initialize = function(){
  for (var i=0;i<config.BRAINSIZE;i++) {
      var a = Box(); //make a random box and copy it over
      this.boxes = [];
      this.boxes.push(a);

      this.boxes[i].out = a.out;
      this.boxes[i].target = a.target;
      this.boxes[i].type = a.type;
      this.boxes[i].kp = a.kp;
      this.boxes[i].bias = a.bias;

      for (var j = 0; j < config.CONNS; j++) {
          this.boxes[i].notted[j] = a.notted[j];
          this.boxes[i].w[j] = a.w[j];
          this.boxes[i].id[j] = a.id[j];

          if (i < config.BRAINSIZE / 2) {
              boxes[i].id[j] = randomint(0, config.INPUTSIZE);
          }
      }
  }
      return this;
};

DWRAONBrain.tick = function(input,output){

    //do a single tick of the brain

    //take first few boxes and set their out to in[].
    for (var i=0; i<config.INPUTSIZE; i++) {
        this.boxes[i].out = input[i];
    }

    //then do a dynamics tick and set all targets
    for (var i=config.INPUTSIZE; i<config.BRAINSIZE; i++) {

       // Box* abox= &boxes[i];

        var abox = this.boxes[i];

        if (abox.type==0) {

            //AND NODE
            var res = 1;
            for (var j=0;j<config.CONNS;j++) {
                var idx = abox.id[j];
                var val= this.boxes[idx].out;
                if (abox.notted[j]) {
                    val = 1-val;
                }
                res = res * val;
            }
            res = abox.bias;
            abox.target = res;

        } else {

            //OR NODE
            res=0;
            for (var j=0;j<config.CONNS;j++) {
                idx = abox.id[j];
                val= this.boxes[idx].out;
                if (abox.notted[j]){
                    val = 1-val;
                }
                res = res + val*abox.w[j];
            }
            res += abox.bias;
            abox.target = res;
        }

        //clamp target
        if (abox.target<0) abox.target = 0;
        if (abox.target>1) abox.target = 1;
    }

    //make all boxes go a bit toward target
    for (var i=config.INPUTSIZE;i<config.BRAINSIZE;i++) {
        abox = this.boxes[i];
        abox.out = abox.out + (abox.target - abox.out)*abox.kp;
    }

    //finally set out[] to the last few boxes output
    for (var i=0;i<config.OUTPUTSIZE;i++) {
        output[i]= this.boxes[config.BRAINSIZE-1-i].out;
    }

};

DWRAONBrain.mutate = function(MR,MR2) {
    for (var j = 0; j < config.BRAINSIZE; j++) {

        if (randomfloat(0, 1) < MR * 3) {
            this.boxes[j].bias += randomnormal(0, MR2);
//             a2.mutations.push_back("bias jiggled\n");
        }

        if (false && randomfloat(0, 1) < MR * 3) {
            this.boxes[j].kp += randomnormal(0, MR2);
            if (this.boxes[j].kp < 0.01) {
                this.boxes[j].kp = 0.01;
            }
        }
        if (this.boxes[j].kp > 1) {
            this.boxes[j].kp = 1;
        }
//             a2.mutations.push_back("kp jiggled\n");

    if (randomfloat(0, 1) < MR * 3) {
        var rc = randomint(0, config.CONNS);
        this.boxes[j].w[rc] += randomnormal(0, MR2);
        if (this.boxes[j].w[rc] < 0.01) {
            this.boxes[j].w[rc] = 0.01;
        }
//             a2.mutations.push_back("weight jiggled\n");
      }

    //more unlikely changes here
    if (randomfloat(0, 1) < MR) {
        var rc = randomint(0, config.CONNS);
        var ri = randomint(0, config.BRAINSIZE);
        this.boxes[j].id[rc] = ri;
//             a2.mutations.push_back("connectivity changed\n");
    }

    if (randomfloat(0, 1) < MR) {
        var rc = randomint(0, config.CONNS);
        this.boxes[j].notted[rc] = !boxes[j].notted[rc];
//             a2.mutations.push_back("notted was flipped\n");
    }

    if (randomfloat(0, 1) < MR) {
        this.boxes[j].type = 1 - this.boxes[j].type;
//             a2.mutations.push_back("type of a box was changed\n");
    }
}
};

DWRAONBrain.crossover = function(brain1,brain2) {

    var newbrain = DWRAONBrain.initialize();

    for (var i=0;i<newbrain.boxes.size(); i++) {
        newbrain.boxes[i].bias = randomfloat(0,1)<0.5 ? brain1.boxes[i].bias : brain2.boxes[i].bias;
        newbrain.boxes[i].kp = randomfloat(0,1)<0.5 ? brain1.boxes[i].kp : brain2.boxes[i].kp;
        newbrain.boxes[i].type = randomfloat(0,1)<0.5 ? brain1.boxes[i].type : brain2.boxes[i].type;

        for (var j=0;j<newbrain.boxes[i].id.size();j++) {
            newbrain.boxes[i].id[j] = randomfloat(0,1)<0.5 ? brain1.boxes[i].id[j] : brain2.boxes[i].id[j];
            newbrain.boxes[i].notted[j] = randomfloat(0,1)<0.5 ? brain1.boxes[i].notted[j] : brain2.boxes[i].notted[j];
            newbrain.boxes[i].w[j] = randomfloat(0,1)<0.5 ? brain1.boxes[i].w[j] : brain2.boxes[i].w[j];
        }
    }
    return newbrain;
};


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Agent = new Object();

Agent.initialize = function(){
this.pos = [ config.WIDTH*Math.random() , config.HEIGHT*Math.random() ];
this.angle = randomfloat(-Math.PI,Math.PI);
this.health = 1 + randomfloat(0,0.1);
this.age = 0;
this.spikeLength = 0;
this.red = 0;
this.gre = 0;
this.blu = 0;
this.w1 = 0;
this.w2 = 0;
this.soundmul = 1;
this.give = 0;
this.clockf1 = 0;
this.clockf2 = 0;
this.boost = 0;
this.indicator = 0;
this.gencount = 0;
this.selectflag = 0;
this.ir = 0;
this.ig = 0;
this.ib = 0;
this.temperature_preference = randomfloat(0,1);
this.selectflag = 0;
this.hybrid = false;
this.herbivore = randomfloat(0,1);
this.repcounter= agent.herbivore*randomfloat(config.REPRATEH-0.1,config.REPRATEH+0.1) + (1-this.herbivore)*randfloat(config.REPRATEC - 0.1, config.REPRATEC+0.1);
this.id = 0;
this.smellmod= randomfloat(0.1, 0.5);
this.soundmod= randomfloat(0.2, 0.6);
this.hearmod= randomfloat(0.7, 1.3);
this.eyesensmod= randomfloat(1, 3);
this.bloodmod= randomfloat(1, 3);
this.MUTRATE1= randomfloat(0.001, 0.005);
this.MUTRATE2= randomfloat(0.03, 0.07);
this.spiked= false;

this.in = initArray(config.INPUTSIZE, 0);
this.out = initArray(config.OUTPUTSIZE, 0);

this.eyefov.initArray(config.NUMEYES, 0);
this.eyedir.initArray(config.NUMEYES, 0);

for(var i=0;i<config.NUMEYES;i++) {
    this.eyefov[i] = randomfloat(0.5, 2);
    this.eyedir[i] = randomfloat(0, 2*Math.PI);
    }
this.brain = DWRAONBrain.initialize(); //Where is analogous part of original c++ code? -JE
};

Agent.printSelf = function(){
 console.log("Agent age = "+this.age+"\n");
};

Agent.initEvent = function(size,r,g,b){
    this.indicator = size;
    this.ir = r;
    this.ig = g;
    this.ib = b;
};

Agent.tick = function(){
    this.brain.tick(input,output);
};

Agent.reproduce = function(MR,MR2)
{
    var BDEBUG = false;
    if(BDEBUG) console.log("New birth---------------\n");
    var a2 = Agent.initialize();

    //spawn the baby somewhere close by behind agent
    //we want to spawn behind so that agents don't accidentally eat their young right away
    //Vector2f fb(config.BOTRADIUS,0);
    //fb.rotate(-a2.angle);
    //a2.pos= this.pos + fb + [randomfloat(-config.BOTRADIUS*2,config.BOTRADIUS*2), randomfloat(-config.BOTRADIUS*2,config.BOTRADIUS*2)];
    if (a2.pos.x<0) {a2.pos.x = config.WIDTH+a2.pos.x};
    if (a2.pos.x>= config.WIDTH) {a2.pos.x= a2.pos.x - config.WIDTH};
    if (a2.pos.y<0) {a2.pos.y = config.HEIGHT+a2.pos.y};
    if (a2.pos.y>= config.HEIGHT) {a2.pos.y= a2.pos.y - config.HEIGHT};

    a2.gencount= this.gencount+1;
    a2.repcounter= a2.herbivore*randomfloat(config.REPRATEH-0.1,config.REPRATEH+0.1) + (1-a2.herbivore)*randomfloat(config.REPRATEC-0.1,config.REPRATEC+0.1);

    //noisy attribute passing
    a2.MUTRATE1= this.MUTRATE1;
    a2.MUTRATE2= this.MUTRATE2;
    if (randomfloat(0,1)<0.1) {a2.MUTRATE1= randomnormal(this.MUTRATE1, config.METAMUTRATE1)};
    if (randomfloat(0,1)<0.1) {a2.MUTRATE2= randomnormal(this.MUTRATE2, config.METAMUTRATE2)};
    if (this.MUTRATE1<0.001) {this.MUTRATE1= 0.001};
    if (this.MUTRATE2<0.02) {this.MUTRATE2= 0.02};
    a2.herbivore= cap(randomnormal(this.herbivore, 0.03));
    if (randomfloat(0,1)<MR*5) a2.clockf1= randomnormal(a2.clockf1, MR2);
    if (a2.clockf1<2) a2.clockf1= 2;
    if (randomfloat(0,1)<MR*5) a2.clockf2= randomnormal(a2.clockf2, MR2);
    if (a2.clockf2<2) a2.clockf2= 2;

    a2.smellmod = this.smellmod;
    a2.soundmod = this.soundmod;
    a2.hearmod = this.hearmod;
    a2.eyesensmod = this.eyesensmod;
    a2.bloodmod = this.bloodmod;
    if(randomfloat(0,1)<MR*5) {var oo = a2.smellmod; a2.smellmod = randomnormal(a2.smellmod, MR2); if(BDEBUG) console.log("smell mutated from " + oo + " to " + a2.smellmod+"\n");}
    if(randomfloat(0,1)<MR*5) {var oo = a2.soundmod; a2.soundmod = randomnormal(a2.soundmod, MR2); if(BDEBUG) console.log("sound mutated from " + oo + " to " + a2.soundmod+"\n");}
    if(randomfloat(0,1)<MR*5) {var oo = a2.hearmod; a2.hearmod = randomnormal(a2.hearmod, MR2); if(BDEBUG) console.log("hearing mutated from " + oo + " to " + a2.hearmod+"\n");} 
    if(randomfloat(0,1)<MR*5) {var oo = a2.eyesensmod; a2.eyesensmod = randomnormal(a2.eyesensmod, MR2); if(BDEBUG) console.log("eyesens mutated from " + oo + " to " + a2.eyesensmod+"\n");} 
    if(randomfloat(0,1)<MR*5) {var oo = a2.bloodmod; a2.bloodmod = randomnormal(a2.bloodmod, MR2); if(BDEBUG) console.log("smell mutated from " + oo + " to " + a2.smellmod+"\n");}

    a2.eyefov = this.eyefov;
    a2.eyedir = this.eyedir;
    for(var i=0;i<NUMEYES;i++){
    if(randomfloat(0,1)<MR*5) a2.eyefov[i] = randomnormal(a2.eyefov[i], MR2);
    if(a2.eyefov[i]<0) a2.eyefov[i] = 0;

    if(randomfloat(0,1)<MR*5) a2.eyedir[i] = randomnormal(a2.eyedir[i], MR2);
    if(a2.eyedir[i]<0) a2.eyedir[i] = 0;
    if(a2.eyedir[i]>2*M_PI) a2.eyedir[i] = 2*M_PI;
}

    a2.temperature_preference= cap(randomnormal(this.temperature_preference, 0.005));
//    a2.temperature_preference= this.temperature_preference;

    //mutate brain here
    a2.brain= this.brain;
    a2.brain.mutate(MR,MR2);

    return a2;
};

Agent.reproduce = function(other){
    //this could be made faster by returning a pointer
    //instead of returning by value
    var anew = Agent.initialize();
    anew.hybrid = true; //set this non-default flag
    anew.gencount = this.gencount;
    if (other.gencount<anew.gencount) {
        anew.gencount = other.gencount;
    }

    //agent heredity attributes
    anew.clockf1 = randomfloat(0,1)<0.5 ? this.clockf1 : other.clockf1;
    anew.clockf2 = randomfloat(0,1)<0.5 ? this.clockf2 : other.clockf2;
    anew.herbivore = randomfloat(0,1)<0.5 ? this.herbivore : other.herbivore;
    anew.MUTRATE1 = randomfloat(0,1)<0.5 ? this.MUTRATE1 : other.MUTRATE1;
    anew.MUTRATE2 = randomfloat(0,1)<0.5 ? this.MUTRATE2 : other.MUTRATE2;
    anew.temperature_preference = randomfloat(0,1)<0.5 ? this.temperature_preference : other.temperature_preference;

    anew.smellmod = randomfloat(0,1)<0.5 ? this.smellmod : other.smellmod;
    anew.soundmod = randomfloat(0,1)<0.5 ? this.soundmod : other.soundmod;
    anew.hearmod = randomfloat(0,1)<0.5 ? this.hearmod : other.hearmod;
    anew.eyesensmod = randomfloat(0,1)<0.5 ? this.eyesensmod : other.eyesensmod;
    anew.bloodmod = randomfloat(0,1)<0.5 ? this.bloodmod : other.bloodmod;

    anew.eyefov = randomfloat(0,1)<0.5 ? this.eyefov : other.eyefov;
    anew.eyedir = randomfloat(0,1)<0.5 ? this.eyedir : other.eyedir;

    anew.brain = this.brain.crossover(other.brain);

    return anew;
};


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

World = new Object()

World.initialize = function(){
   this.modcounter = 0;
   this.current_epoch = 0;
   this.idcounter = 0;
   this.FW = (config.WIDTH / config.CZ);
   this.FH = (config.HEIGHT / config.CZ);
   this.CLOSED = false;

   this.addRandomBots(config.NUMBOTS);

   //inititalize food layer
    for (var x=0; x<this.FW; x++) {
        for (var y=0; y<this.FH; y++) {
            this.food[x][y]= 0;
        }
    };

    this.numCarnivore = initArray(200, 0); //Is this right? -JE
    this.numHerbivore = initArray(200, 0);
    this.ptr = 0;
};

World.update = function (){
    this.modcounter += 1;

    //Process periodic events
    //Age goes up!
    if (this.modcounter % 100 == 0) {
        for (var i=0; i<this.agents.size(); i++) {
            this.agents[i].age += 1;    //agents age...
        }
    }

    if(this.modcounter % 1000 == 0){
        this.num_herbs_carns = this.numHerbCarnivores();
        this.numHerbivore[ptr]= this.num_herbs_carns.first;
        this.numCarnivore[ptr]= this.num_herbs_carns.second;
        this.ptr++;
        if(this.ptr == this.numHerbivore.size()) {this.ptr = 0};
    }

    if (this.modcounter % 1000 == 0) writeReport();

    if (this.modcounter >= 10000) {
        this.modcounter = 0;
        this.current_epoch++;
    }

    if (this.modcounter % config.FOODADDFREQ == 0) {
        this.fx = randomint(0,this.FW);
        this.fy = randomint(0,this.FH);
        this.food[this.fx][this.fy] = config.FOODMAX;
    }

    //reset any counter variables per agent
    for(var i=0; i< this.agents.size(); i++){
        this.agents[i].spiked= false;
    }

    //give input to every agent. Sets in[] array
    this.setInputs();

    //brains tick. computes in[] -> out[]
    this.brainsTick();

    //read output and process consequences of bots on environment. requires out[]
    this.processOutputs();

    //process bots: health and deaths
    for (var i=0; i<this.agents.size(); i++) {
        var baseloss= 0.0002;

        if (this.agents[i].boost) {
            //boost carries its price, and it's pretty heavy!
            this.agents[i].health -= baseloss*config.BOOSTSIZEMULT*1.3;
        } else {
            this.agents[i].health -= baseloss;
        }
    }

    //process temperature preferences
    for (var i=0; i<this.agents.size(); i++) {

        //calculate temperature at the agents spot. (based on distance from equator)
        var dd = 2.0*Math.abs(this.agents[i].pos.x/config.WIDTH - 0.5);
        var discomfort = Math.abs(dd - this.agents[i].temperature_preference);
        discomfort = discomfort*discomfort;
        if (discomfort<0.08) {discomfort=0};
        this.agents[i].health -= config.TEMPERATURE_DISCOMFORT*discomfort;
    }

    //process indicator (used in drawing)
    for (var i=0; i<this.agents.size();i++){
        if(this.agents[i].indicator>0) {this.agents[i].indicator -= 1};
    }

    //remove dead agents.
    //first distribute foods
    for (var i=0; i<this.agents.size(); i++) {
        //if this agent was spiked this round as well (i.e. killed). This will make it so that
        //natural deaths can't be capitalized on. I feel I must do this or otherwise agents
        //will sit on spot and wait for things to die around them. They must do work!
        if (this.agents[i].health <=0 && this.agents[i].spiked) {

            //distribute its food. It will be erased soon
            //first figure out how many are around, to distribute this evenly
            var numaround=0;
            for (var j=0; j<this.agents.size(); j++) {
                if (this.agents[j].health>0) {
                    var d = (this.agents[i].pos - this.agents[j].pos).length(); //Should I use Google closure vector class for this?
                    if (d < config.FOOD_DISTRIBUTION_RADIUS) {
                        numaround++;
                    }
                }
            }

            //young killed agents should give very little resources
            //at age 5, they mature and give full. This can also help prevent
            //agents eating their young right away
            var agemult= 1.0;
            if(this.agents[i].age < 5) {agemult = this.agents[i].age*0.2};

            if (numaround>0) {
                //distribute its food evenly
                for (var j=0; j<this.agents.size(); j++) {
                    if (this.agents[j].health>0) {
                        var d= (this.agents[i].pos - this.agents[j].pos).length();
                        if (d < config.FOOD_DISTRIBUTION_RADIUS) {
                            this.agents[j].health += 5*(1-this.agents[j].herbivore)*(1-this.agents[j].herbivore)/Math.pow(numaround,1.25)*agemult;
                            this.agents[j].repcounter -= config.REPMULT*(1-this.agents[j].herbivore)*(1-this.agents[j].herbivore)/Math.pow(numaround,1.25)*agemult; //good job, can use spare parts to make copies
                            if (this.agents[j].health>2) {this.agents[j].health=2}; //cap it!
                            this.agents[j].initEvent(30,1,1,1); //white means they ate! nice
                        }
                    }
                }
            }

        }
    }

        //Not sure if this makes any sense in JS -JE
    var iter = this.agents.begin();
    while (iter != this.agents.end()) {
        if (iter.health <=0) {
            iter = this.agents.erase(iter);
        } else {
            ++iter;
        }
    }

    //handle reproduction
    for (var i=0; i<this.agents.size(); i++) {
        if (this.agents[i].repcounter<0 && this.agents[i].health>0.65 && this.modcounter % 15 == 0 && randomfloat(0,1)<0.1) { //agent is healthy and is ready to reproduce. Also inject a bit non-determinism
            //agents[i].health= 0.8; //the agent is left vulnerable and weak, a bit
            this.reproduce(i, this.agents[i].MUTRATE1, this.agents[i].MUTRATE2); //this adds conf::BABIES new agents to agents[]
            this.agents[i].repcounter = this.agents[i].herbivore*randomfloat(config.REPRATEH - 0.1 , config.REPRATEH+0.1) + (1-this.agents[i].herbivore)*randomfloat(config.REPRATEC - 0.1, config.REPRATEC+0.1);
        }
    }

    //add new agents, if environment isn't closed
    if (!this.CLOSED) {
        //make sure environment is always populated with at least NUMBOTS bots
        if (this.agents.size()<config.NUMBOTS
            ) {
            //add new agent
            this.addRandomBots(1);
        }
        if (this.modcounter % 100 == 0) {
            if (randomfloat(0,1)<0.5){
                this.addRandomBots(1); //every now and then add random bots in
            }else
                this.addNewByCrossover(); //or by crossover
        }
    };

};