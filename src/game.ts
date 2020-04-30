///////////////////// Interfaces /////////////////////

interface Level {
    id: number,
    n: number;
    m: number;
    steps: number;
    score: number;
    blocked_block?: Pos[]
}
  
interface Pos {
    x: number;
    y: number;
}

interface HtmlLinked {
    html: JQuery<HTMLElement>;
    pos: Pos;
}

interface Candy extends HtmlLinked {
    type: string;
    mark?: boolean;
    turn_to_special?: boolean; // Swap to enum after expanding
}

interface Tile extends HtmlLinked {
    type: string;
    // candy?: Candy;
}

interface AnimObject {
    element: JQuery<HTMLElement>;
    appliedCss: object;
    onFinish: () => void;
    animationTime: number;
};
  
///////////////////// Services /////////////////////

interface IScoreService {
  _score: number;
  _onScoreChange: ((score: number) => void)[];
  _baseScore: number;
  _multiplyer: number;

  multiplyerIncrease(): void;
  resetMultiplyer(): void;
  getScore(): number;
  subscribeScoreChange(callback: (score: number) => void): void;
  clearCallbacks(): void;
  onScoreChange(): void;
  blocksRemoved(n: number): void;
  resetScore(): void;
};

const scoreService: IScoreService= {
  _score: 0,
  _onScoreChange: [],
  _baseScore: 20,
  _multiplyer: 1,

  multiplyerIncrease() {
    this._multiplyer += .5;
  },

  resetMultiplyer() {
    this._multiplyer = 1;
  },

  getScore() {
    return this._score;
  },

  subscribeScoreChange(callback: (score: number) => void) {
    this._onScoreChange.push(callback);
  },

  clearCallbacks() {
    this._onScoreChange.splice(0);
  },

  onScoreChange() {
      this._onScoreChange.forEach(c => c(this._score));
  },

  // If 3 + 2 Call this Twice !! 
  blocksRemoved(n: number) {
    this._score += this._multiplyer * n * this._baseScore;
    this.onScoreChange();
    // This is designed for high fall & match rate.
    this.multiplyerIncrease();
  },

  resetScore() {
      this._score = 0;
      this.onScoreChange();
  }
}; 

interface IStepService {
  _steps: number;
  _maxSteps: number;
  _onFinish: (() => void)[];
  _onStepChange: ((steps: number) => void)[];

  step(): void;
  setStartSteps(n: number): void;
  stepChanged(): void;
  
  finish(): void;
  reset(): void;

  clearOnEnd(): void;
  clearStepChange(): void;

  subscribeOnZeroSteps(callback: () => void): void;
  subscribeStepChange(callback: (steps: number) => void): void;
};

const stepService: IStepService = {
  _steps: 0,
  _maxSteps: 15,
  _onFinish: [],
  _onStepChange: [],
  
  step(){
    this._steps--;

    this.stepChanged();
    if (this._steps == 0) {
      this.finish();
    }
  },
  stepChanged() {
    this._onStepChange.forEach(c => c(this._steps));
  },

  setStartSteps(n: number) {
    this._maxSteps = n;
    this._steps = n;
    this.stepChanged();
  },

  reset() {
    this._steps = this._maxSteps;
    this.stepChanged();
  },
  
  clearOnEnd() {
    this._onFinish.splice(0);
  },

  clearStepChange() {
    this._onStepChange.splice(0);
  },

  finish() {
    this._onFinish.forEach(callback => {
      callback();
    });
  },

  subscribeOnZeroSteps(callback: () => void){
    this._onFinish.push(callback);
  },
  subscribeStepChange(callback: (steps: number) => void): void {
    this._onStepChange.push(callback);
  }
} 

const base_delay: number = 1;
type AnimationPromise = (() => Promise<void>);
interface IAnimationService {
  _nextFinishId: any;
  _animationQueue: {animation: AnimObject, time: number, finished: boolean}[];
  _animationFinishEvent: {callback: () => void, runTimes: number}[];
  _animationTime: number;
  _programTime: number;
  _iterval: null;
  _animationInProgress: boolean;

  clearAnimations(): void;

  getProgramTime(): number;
  getAnimationTime(): number;
  isAnimationInProgress(): boolean

  moveClock(times?: number): number;
  add(animation: AnimObject, relativeTime?: number): void;

  subscribeTimeEqulibrium(observer: () => void, runTime?: number): void;
  clearSubscriptions(): void;

  add_v2(animation: AnimationPromise, relativeTime?: number): void;
  animate_v2(): void;
  animationFinished(): void;
  removeFinished_v2(): void;
  _animationQueue_v2: {animation: AnimationPromise, time: number, finished: boolean}[];
}

// TODO:: Build logic to controll animate


const animationService : IAnimationService = {
  _animationQueue: [],
  _animationQueue_v2: [],
  _animationTime: 0,
  _animationFinishEvent: [],
  _nextFinishId: 1,
  _programTime: 0,
  _iterval: null,
  _animationInProgress: false,

  add(animation: AnimObject, relativeTime: number = base_delay) {
    this._animationQueue.unshift({
      time: this._programTime + relativeTime,
      animation,
      finished: false
    });
  },

  add_v2(animation:AnimationPromise, relativeTime: number = base_delay) {
    this._animationQueue_v2.unshift({
      time: this._programTime + relativeTime,
      animation,
      finished: false
    });
  },

  clearAnimations() {
    this._animationQueue_v2.splice(0);
    this._animationInProgress = false;

    this._programTime += 10;
    this._animationTime = this._programTime;
    
  },

  animate_v2() {
    this._animationInProgress = true;

    const cycle = this._animationTime;
    const toAnimate: Promise<void>[] = [];

    this._animationQueue_v2.forEach(qitem => {
        if (qitem.time == cycle) {
            toAnimate.push(qitem.animation());
        };
    });
    
    Promise.all(toAnimate)
        .then(() => {
            setTimeout(() => {
                this._animationTime += 1;
                this.removeFinished_v2();
    
                if (this._animationTime <= this._programTime) {
                    this.animate_v2();
                } else {
                    this._animationInProgress = false;
                    this.animationFinished();
                }
            }, 200)

        });
  },

  animationFinished(): void {
    this._animationFinishEvent = this._animationFinishEvent.filter(e => {
        e.runTimes--;
        e.callback();
        return e.runTimes != 0;
    });
  },

  removeFinished_v2() {
    for (let i = this._animationQueue_v2.length - 1; i >= 0; i--) {
        if (this._animationQueue_v2[i].time < this._animationTime) {
            this._animationQueue_v2.splice(i, 1);
        }
    }
  },

  getProgramTime(): number {
    return this._programTime;
  },

  getAnimationTime() {
    return this._animationTime;
  },

  isAnimationInProgress(): boolean {
    return this._animationInProgress;
  },

  // Return number for better handling
  subscribeTimeEqulibrium(observer: () => void, runTimes: number = -1 ) {
    const obj = {runTimes, callback: observer};
    this._animationFinishEvent.push(obj);
  },

  // For better handling
  // clearSubscription(id: number) {

  // },
  clearSubscriptions() {
    this._animationFinishEvent.splice(0);
  },

  moveClock(times: number = 1): number {
    this._programTime += times;

    if (!this._animationInProgress) {
        this.animate_v2();
    }

    return this._programTime;
  }
};

interface SoundService {
    _basepath: string;
    _pop1: HTMLAudioElement;
    _pop2: HTMLAudioElement;
    _bg: HTMLAudioElement;
    _bg_loop: number;
    cunter: number;
    _effects: boolean;
    
    init(): void;
    playBackground(): void;
    
    startBackroundMusick(): void;
    toggleBackground(): boolean;

    toggleEffects(): boolean;
    playPop(): void;
    playPop2(): void;
}
const soundService: SoundService = {
    _basepath: './assets/',
    _pop1: new Audio(),
    _pop2: new Audio(),
    _bg: new Audio(), 
    _effects: true,
    _bg_loop: -1,

    cunter: 0,
    init() {
        const background = new Audio(this._basepath + 'background.mp3');
        this._bg = background;
        this._pop1 = new Audio(this._basepath + 'pop_3.mp3');
        this._pop2 = new Audio(this._basepath + 'pop_2.wav');
        
        let sounds = $('<div></div>');

        sounds.append(this._bg, this._pop1, this._pop2);
        sounds.appendTo($('body'));
    },

    startBackroundMusick() {
        this.playBackground();
        if (this._bg_loop == -1) {
            this._bg_loop = setInterval(() => this.playBackground(), Math.ceil(this._bg.duration) * 1000);
        }
    },

    playBackground() {
        this._bg.play().then(() => this.playBackground);
    },

    toggleBackground (): boolean {
        this._bg.muted = !this._bg.muted;
        return !this._bg.muted;
    },

    toggleEffects(): boolean {
        this._effects = !this._effects;
        return this._effects;
    },
    
    playPop(){
        if (this._effects) {
            this._pop1.play();
        }
    },
    playPop2() {
        if (this._effects) {
            this._pop2.play();
        }
    },

}

const topListService = {
    _topList: $(''),
    _displaydScores: $(''),
    _displayed: 1,
    
    
    init () {
        $('#prev-score').on('click', () => {
            this._displayed -= 1;
            const lowestMapID = levels.reduce((a,b) => a.id < b.id ? a : b).id;
            this._displayed = this._displayed < lowestMapID ? lowestMapID : this._displayed;
            this.displayScores()
        });

        $('#next-score').on('click', () => {
            this._displayed += 1;
            const highestMapID = levels.reduce((a,b) => a.id > b.id ? a : b).id;
            this._displayed = this._displayed > highestMapID ? highestMapID : this._displayed;
            this.displayScores();
        });

        this._topList = $('#toplist-scores');
        this._displaydScores = $('#displayed-level-scores');

        this._displayed = levels.reduce((a,b) => a.id < b.id ? a : b).id;
        this.displayScores();
    },

    displayScores() {
        const scoresToDisplay = scores[this._displayed];
        this._displaydScores.text(this._displayed);

        this._topList.children().each((i, element) => element.remove());
        scoresToDisplay.forEach(e => {
            let li = $('<li class="toplist-item"></li>');
            let score = $(`<span class="toplist-username">${e.username}</span>`);
            let username = $(`<span class="toplist-score ${e.difficulty}">${e.score}</span>`);
            
            li.append(score);
            li.append(username);

            li.appendTo(this._topList);

        });

    }
};


/////////////////////

interface TopListScore {
    mapId: number;
    username: string;
    score: number;
    difficulty: string;
}

const lvlEndPopUp = (score: number, uname: string = '') => {
    const onFinish = () => {
        //@ts-ignore
        let uname = nameInput.val().toString();

        if (uname == '') {
            uname = 'anonym hero'
        };

        // Save username for later usage
        username = uname;

        const lvlId = lvl.id;
        const mapScores = scores[lvlId];

        let curr: TopListScore = {
            mapId: lvlId,
            username,
            score,
            difficulty: difficultyService.currentDifficulty
        };

        let i;
        for (i = 0; i != mapScores.length; i++) {
            if (score > mapScores[i].score){
                break;
            }
        };

        const after = mapScores.splice(i);
        mapScores.push(curr, ...after)
        topListService.displayScores();
        popup.remove();
    };

    const popup = $('<div class="popup"></div>');
    const upper = $('<div class="upper"></div>');
    let msg = score >= lvl.score ? 'Level Compleated' : 'U are a faailure!Better luck nextime';
    
    upper.append($(`<div>${msg}</div>`));
    const buttons = $('<div class="buttons"></div>');
    let again = $('<button>Again</button>');
    again.on('click', () => {
        onFinish();
        lvlService.restart();
    });

    let nextLvl = $('<button>Next</button>');
    nextLvl.on('click', () => {
        onFinish();
        lvlService.setupMap(lvl.id + 1);
    });

    let retry = $('<button>Try again</button>');
    retry.on('click', () => {
        onFinish();
        lvlService.restart();
    });

    if (lvl.score > score) {
        upper.append($(`<div>Goal: ${lvl.score} got: <span>${score}</span></div>`));
        buttons.append(retry);
    } else {
        upper.append($(`<div>Score: <span>${score}</span></div>`));
        buttons.append(again, nextLvl);
        lvlService.levelCompleted();
    }

    const r = $('<div></div>');
    const label= $('<label>Username: </label>');
    const nameInput = $(`<input type="text" value="${uname}"/>`);

    nameInput.appendTo(label);
    r.append(label);
    upper.append(r);


    popup.append(upper, buttons);
    popup.appendTo($('.game'));

}

const difficulties = {
    medium: 'medium',
    easy: 'easy',
    hard: 'hard',
};
const difficultyService = {
    currentDifficulty: difficulties.medium,
    setupDifficulty(diff: string) {
        switch(diff) {
            case difficulties.easy: activeCandies = 3; break;
            case difficulties.medium: activeCandies = 4; break;
            case difficulties.hard: activeCandies = 5; break;
        };

        $(`#${this.currentDifficulty}`).removeClass('active');
        $(`#${diff}`).addClass('active');

        this.currentDifficulty = diff;
    },

    changeDifficulty(diff: string) {
        if (stepService._maxSteps != stepService._steps) {
            let doit = {
                text: 'I said do it!!',
                onClick: () => this.setupDifficulty(diff)
            };

            lvlService.changeDurringGame([doit]);
        }
        else {
            this.setupDifficulty(diff);
        }
    }
}

type Levels = Level[];
const levels: Levels = [
    {
        id: 1,
        n: 8,
        m: 6,
        steps: 4,
        score: 1000
    },
    {
        id: 2,
        n: 9,
        m: 10,
        steps: 5,
        score: 3000
    },
    {
        id: 3,
        n: 6,
        m: 8,
        steps: 10,
        score: 4000
    },
    {
        id: 4,
        n: 10,
        m: 10,
        steps: 15,
        score: 6000
    },
    {
        id: 5,
        n: 20,
        m: 15,
        steps: 10,
        score: 40000
    },
];

let lvl: Level;

const lvlService = {
    prev_btn: $(''),
    next_btn: $(''),
    highest_completed: 0,
    // lvl: levels[0], // Actual Level
    

    init() {
        this.prev_btn = $('#previous-lvl');
        this.next_btn = $('#next-lvl');

        this.prev_btn.on('click', () => {
            if (stepService._steps != stepService._maxSteps) {
                this.changeDurringGame([{
                    text: 'Change Level NOW!!',
                    onClick: () => this.setupMap(lvl.id - 1)
                }])
            } else {
                this.setupMap(lvl.id - 1);
            }
        });

        this.next_btn.on('click', () => {
            if (stepService._steps != stepService._maxSteps) {
                this.changeDurringGame([{
                    text: 'Change Level NOW!!',
                    onClick: () => this.setupMap(lvl.id + 1)
                }])
            } else {
                this.setupMap(lvl.id + 1);
            }
        });

        // this.lvl = levels[0]; 
    },

    levelCompleted() {
        this.highest_completed = lvl.id > this.highest_completed ? lvl.id : this.highest_completed; 
    },

    mapSwitcherButtonUpdater() {
        if (this.highest_completed >= lvl.id) {
            this.next_btn.show();
        } else {
            this.next_btn.hide();
        }

        if (lvl.id > levels.reduce((a, b) => a.id < b.id ? a : b).id) {
            this.prev_btn.show();
        } else {
            this.prev_btn.hide();
        }

    },

    /**
     * 
     * @param actionButtons Every button except the cancel ;
     */
    changeDurringGame(actionButtons: {text: string, onClick:() => void}[]) {
        const onClick = () => {
            popup.remove();
        };
        
        let popup = $('<div class="popup"></div>')
        let info = $('<div class="info"></div>')
        let button_section = $('<div class="btns"></div>')
        
        let p1 = $('<p>You are in the middle of a game, if you switch now your progress will be lost. </p>');
        let p2 = $('<p>Are you sure you wanna switch now?</p>');
        
        let buttons = [];
        
        actionButtons.forEach(e => {
            let btn = $(`<button>${e.text}</button>`);
            btn.on('click', () => {
                e.onClick();
                onClick();
            });

            buttons.push(btn);
        });

        let cancel = $('<button>Nah, it\'s fine later</button>');
        cancel.on('click', () => onClick());

        buttons.unshift(cancel);

        info.append(p1, p2);
        button_section.append(...buttons);
        popup.append(info, button_section);
        
        popup.appendTo($('body'));
    },

    clearCandies() {
        game_area.children().each((_, element)=> {
            if (element.classList.contains('candy')){
                element.remove()
            }
        });
    
        candies_structured.splice(0);
    },

    restart(){
        stepService.reset();
        scoreService.resetScore();
        scoreService.resetMultiplyer();
        animationService.clearAnimations();
        
        this.mapSwitcherButtonUpdater();
        this.clearCandies();
        this.fillTiles();
    },
    
    setupMap(mapId: number){
    
        // for new map gen // Always needed
        clearCurrentMap();
    
        // If new map gen
        //@ts-ignore
        lvl = levels.find(e => e.id == mapId);
        $('#mapId').text(lvl.id);
        $('#goal-score').text(lvl.score);
    
        tile_size = game_area_height / lvl.m;
        candy_size = tile_size * candy_to_tile;
        
    
        this.generateTiles(lvl.n, lvl.m);
        generateObstacles();
    
        // Before start
        this.fillTiles();
        scoreService.resetScore();
        stepService.setStartSteps(lvl.steps);
        this.mapSwitcherButtonUpdater();
    },
    
    fillTiles() {
        for(let x = 0; x != tiles_structured.length; x++) {
            
            let col: Candy[] = [];
            for(let y = 0; y != tiles_structured[x].length; y++) {
                if (tiles_structured[x][y].type == tile_types.void) { continue; }
                const tile = tiles_structured[x][y];
                let candy: Candy;
                
                if (tile.type == tile_types.void) {
                    candy = {
                        type: candy_types.void,
                        pos: {x,y},
                        //@ts-ignore
                        html: null
                    };
                } else {
    
                    let current = Math.floor(Math.random() * activeCandies);
                    if (y >= 2 && 
                        col[y-1].type == candy_types.formNumber(current) && 
                        col[y-2].type == candy_types.formNumber(current)) {
                        current = (current+1) % activeCandies; 
                    }
                    
                    if (x >= 2 &&
                        candies_structured[x-1][y].type == candy_types.formNumber(current) &&
                        candies_structured[x-2][y].type == candy_types.formNumber(current)) {
                        current = (current+1) % activeCandies; 
                    }
    
                    candy = generateCandy({x,y}, false, candy_types.formNumber(current));
    
                    game_area.append(candy.html);
                }
    
                col.push(candy);
            }
    
            candies_structured.push(col);
        }
    },
    
    generateTiles(n: number, m: number) {
        for (let x = 0; x != n; x++) {
            let col = [];
            for (let y = 0; y != m; y++) {
                let html_tile = $('<div class="tile"></div>');
    
                html_tile.css({
                    height: tile_size,
                    width: tile_size,
                    top: tile_size * y,
                    left: tile_size * x, 
                });
                
                let tile: Tile = {
                    pos: {x, y},
                    type: tile_types.normal,
                    html: html_tile
                };
    
                // html_tile.on('click', (e) => console.log(tile));
    
                add_mouse_envets(tile);
    
                tile.html.appendTo(game_area);
                col.push(tile);
                tiles.push(tile);
            }
            tiles_structured.push([...col]);
        }
    }
}

////
const purple = 'purple';
const green = 'green';
const yellow = 'yellow';
const red = 'red';
const blue = 'blue';
const special = 'special';

let activeCandies: number = 4;

const tile_types = {
    normal: "normal",
    void: "void",
}

const candy_types = {
    purple,
    green,
    yellow,
    red,
    blue,

    special,
    void: "void",

    formNumber: (n: number): string => {
        switch (n){
            case 0: return candy_types.purple;
            case 1: return candy_types.yellow;
            case 2: return candy_types.red;
            case 3: return candy_types.green;
            case 4: return candy_types.blue;
            default: return "Error";
        }
    },
    randomType(): string {
        return this.formNumber(Math.floor(Math.random() * activeCandies));
    }
};

const direction = {
    left: 0,
    right: 1,
    up: 2,
    down: 3,
    getDirection(x1: number, x2: number, y1: number, y2: number): number {
        return x1 == x2 ? (y2 > y1 ? this.down : this.up)  
                        : (x2 > x1 ? this.right : this.left);
    },
    fromVector(x: number, y: number): number {
        return x == 0 ? ( y > 0 ? this.down : this.up )
                      : ( x > 0 ? this.right : this.left );
    },
    getReverse(direct: number): number {
        switch (direct){
            case (this.right): return this.left; 
            case (this.left): return this.right; 
            case (this.up): return this.down; 
            case (this.down): return this.up; 
            default: throw Error("Some shit with this");
        };
    }
}



let game_area: JQuery<HTMLElement>;
let game_area_height: number;

let left_start;
let top_start;

let tiles: Tile[] = [];
let tiles_structured: Tile[][] = [];
let candies_structured: Candy[][] = [];
const d_num = 3;
const sepcial_mark = 4;


const get_candy_form_tile = (tile: Tile) => {
    candies_structured[tile.pos.x][tile.pos.y];
};


let selected_tile: Tile | null = null; 
let is_tile_selected = false;
let mouse_is_down = true;
let ableToMove = true;

let refill_active = false;
let username = '';
let highest_completed_level = 0;



let scores: {[mapId: number]: TopListScore[]} = {};

let tile_size: number;
let candy_size: number;
// Candy to Tile ration 
let candy_to_tile =  4 / 5;
let fall_animation_time = 400; 

const generateCandy = (pos: Pos, fall: boolean = false, type?: string): Candy =>  {
    let html = $('<div class="candy"></div>');
    let candy: Candy = {
        html,
        pos: pos ? pos : {x: -1, y: -1}, // pos ?? {x: -1, y: -1},
        type: type ? type : candy_types.randomType(), // type ?? candy_types.randomType(),
    };

    html.addClass(candy.type);

    let gap = tile_size * (1-candy_to_tile) / 2;
    let container = tiles_structured[pos.x][pos.y].html;
    let extra_fall = fall ? tile_size : 0 

    const top = parseInt(container.css('top')) + gap - extra_fall;
    const left = parseInt(container.css('left')) + gap;
    
    html.css({
        height: candy_size,
        width: candy_size,
        top,
        left,
    });

    add_mouse_envets(candy);

    return candy;
};

const add_mouse_envets = (element:HtmlLinked) => {
    element.html.on('mouseover', () => mouseOver(element.pos))
    element.html.on('mousedown', () => mouseDown(element.pos))
};

const setupDifficultyHandling = () => {
    $('#easy').on('click', () => difficultyService.changeDifficulty(difficulties.easy));
    $('#medium').on('click', () => difficultyService.changeDifficulty(difficulties.medium));
    $('#hard').on('click', () => difficultyService.changeDifficulty(difficulties.hard));

    difficultyService.setupDifficulty(difficulties.medium);
}

$(() => {
    game_area = $('#game-area');
    game_area_height = parseInt(game_area.css('height'));

    levels.forEach(e => scores[e.id] = []); 

    addControll();
    
    scoreService.subscribeScoreChange((score: number) => $('#score').text(score));
    stepService.subscribeStepChange((steps: number) => $('#left-moves').text(steps));
    stepService.subscribeOnZeroSteps(() => {
        animationService.subscribeTimeEqulibrium(() => lvlEndPopUp(scoreService.getScore(), username), 1);
    });

    setupDifficultyHandling();


    animationService.subscribeTimeEqulibrium(() => ableToMove = true);
    
    lvlService.init();
    lvlService.setupMap(levels.reduce((a,b)=> a.id < b.id ? a : b).id);
    topListService.init();

    soundService.init();

    $('#background').on('click', e => e.target.childNodes[1].textContent = soundService.toggleBackground() ? "On" : "Off");
    $('#effects').on('click', e => e.target.childNodes[1].textContent = soundService.toggleEffects() ? "On" : "Off");
    $('#startbackgroundMuscik').on('click', () => soundService.startBackroundMusick());

});

// const initMap();

function addControll ()  {
    game_area.on('mousedown', e => e.preventDefault());
    game_area.on('mouseleave', () => mouse_is_down = false);
    game_area.on('mouseup', () => mouse_is_down = false);
};

const clearCurrentMap = () => {
    game_area.children().each((_, element) => element.remove());
    tiles_structured.splice(0);
    candies_structured.splice(0);
};

const generateObstacles = () => {

};



const mouseDown = (pos: Pos) => {
    selected_tile = tiles_structured[pos.x][pos.y];
    mouse_is_down = true;
}

const mouseOver = (pos: Pos) => {
    
    if (selected_tile == null || !mouse_is_down || 
        (selected_tile.pos.x == pos.x && selected_tile.pos.y == pos.y)) { return; }

    // Todo:: Limit to only one difference
    let selected_x = selected_tile.pos.x;
    let selected_y = selected_tile.pos.y;
    
    let diff_x = pos.x - selected_tile.pos.x;
    let abs_x = Math.abs(diff_x);
    let diff_y = pos.y - selected_tile.pos.y;
    let abs_y = Math.abs(diff_y);
    
    if (abs_x >= abs_y){
        diff_x /= abs_x;
        diff_y = 0;
    } else {
        diff_y /= abs_y;
        diff_x = 0;
    }

    let other_tile = tiles_structured[selected_x + diff_x][selected_y + diff_y];
    let direct = direction.fromVector(diff_x, diff_y);
    
    if (other_tile.type == tile_types.normal) {
        move_elements(selected_tile, other_tile, direction.fromVector(diff_x, diff_y)); 
        selected_tile = null;
    }
}

const animateSwap = (first: JQuery<HTMLElement>, second: JQuery<HTMLElement>, direct: number) => {
    let left;
    let top;

    switch (direct) {
        case direction.left: 
            left = -tile_size; top=0; break;
        case direction.right: 
            left = tile_size; top=0; break;
        case direction.up: 
            left = 0; top=-tile_size; break;
        case direction.down: 
            left = 0; top=tile_size; break;
        default: left = 0; top=0;
    }

    let anim = {
        top: `+=${top}`,
        left: `+=${left}`,
    };

    let anim_reverse = {
        top: `+=${-top}`,
        left: `+=${-left}`,
    };

    animationService.add_v2(() => new Promise(resolve => {
        const resolver = () => {
            f++;
            if (f == 2){
                resolve();
            }
        };

        let f = 0;
        first.animate(anim, resolver);
        second.animate(anim_reverse, resolver);
    }));

    animationService.moveClock();


}

const swap = (first: Candy, second: Candy, direct: number) => {

    if (direct == direction.left || direct == direction.right) {
        let y = first.pos.y;
        let temp = candies_structured[first.pos.x].splice(y);

        //@ts-ignore
        candies_structured[first.pos.x].push(candies_structured[second.pos.x].splice(y, 1, temp.shift()).pop());
        candies_structured[first.pos.x].push(...temp)
    } else {
        let list = candies_structured[first.pos.x];
        let lower = Math.min(first.pos.y, second.pos.y);
        let higher = Math.max(first.pos.y, second.pos.y);
        let temp = list.splice(lower);

        //@ts-ignore
        list.push(temp.splice(1, 1).pop());
        list.push(...temp);
    }

    let tmp = {...first.pos}
    first.pos = {...second.pos}
    second.pos = tmp;
    animateSwap(first.html, second.html, direct);
}


const move_elements = async (one: Tile, other: Tile, direct: number) => {
    if (one.type == tile_types.void || other.type == tile_types.void || !ableToMove) { return; }
    ableToMove = false;
    
    let first = candies_structured[one.pos.x][one.pos.y]
    let second = candies_structured[other.pos.x][other.pos.y] 
    
    swap(first, second, direct);
    
    let one_ret = marker(first.pos, first.type);
    let other_ret = marker(second.pos, second.type);
    
    if (one_ret + other_ret == 0) {
        swap(first, second, direction.getReverse(direct));
        ableToMove = true;
    } else {
        scoreService.resetMultiplyer();
        scoreService.blocksRemoved(one_ret + other_ret);
        stepService.step();

        remove();
    }
}

const marker_row = (pos: Pos, candy_type: string): number => {
    let candies = [candies_structured[pos.x][pos.y]];

    if (pos.x < lvl.n) {
        for (let i = pos.x + 1; i != lvl.n; i++) {
            const candy = candies_structured[i][pos.y];
            
            if (candy.type == candy_types.void) {
                break;
            } else if (candy_type == candy.type) {
                candies.push(candy);
            } else {
                break;
            }
        }
    }

    if (pos.x > 0) {
        for (let i = pos.x - 1; i >= 0; i--) {
            const candy = candies_structured[i][pos.y];
            
            if (candy.type == candy_types.void) {
                break;
            } else if (candy_type == candy.type) {
                candies.push(candy);
            } else {
                break;
            }
        }
    }

    if (candies.length >= 3) {
        candies.forEach(candy => candy.mark = true);
    }

    return candies.length >=  3 ? candies.length : 0;  
}

const marker_column = (pos: Pos, candy_type:string): number => {
    let candies = [candies_structured[pos.x][pos.y]];

    if (pos.y < lvl.m) {
        for (let i = pos.y + 1; i != lvl.m; i++) {
            const candy = candies_structured[pos.x][i];
            
            if (candy.type == candy_types.void) {
                break;
            } else if (candy_type == candy.type) {
                candies.push(candy);
            } else {
                break;
            }
        }
    }

    if (pos.y > 0) {
        for (let i = pos.y - 1; i >= 0; i--) {
            const candy = candies_structured[pos.x][i];
            
            if (candy.type == candy_types.void) {
                break;
            } else if (candy_type == candy.type) {
                candies.push(candy);
            } else {
                break;
            }
        }
    }


    if (candies.length >= 3) {
        candies.forEach(candy => candy.mark = true);
    }

    return candies.length >=  3 ? candies.length : 0;  
}

const turn_to_special = (candy: Candy) => {
    animationService.add_v2(() => new Promise(resolve => {
        candy.html.removeClass(candy.type);
        candy.type = candy_types.special;
        candy.html.addClass(candy.type);
        resolve();

        // Sound Effect
    }));

    candy.mark = false;
}

const explosion = (position: Pos): number =>  {
    let exploded = 0;
    for (let x = position.x - 1; x <= position.x + 1; x++){
        for (let y = position.y - 1; y <= position.y + 1; y++) {
            if (x < 0 || x >= lvl.n || y < 0 || y >= lvl.m) {
                continue;
            }

            const candy = candies_structured[x][y];

            if (!candy.mark && candy.type == candy_types.special){
                candy.mark = true;
                exploded += explosion({x, y});
            } else if (!candy.mark && candy.type != candy_types.void) {
                candy.mark = true;
                exploded += 1;
            }
        }
    }

    return exploded;
};

const marker = (candy_pos: Pos, type: string): number => {
    let marks: number;

    if (type == candy_types.special) {
        marks = explosion(candy_pos);
    } else {
        let marks1 = marker_row(candy_pos, type);
        let marks2 = marker_column(candy_pos, type);


        marks = marks1 + marks2; 
        
        if (marks >= sepcial_mark) {
            turn_to_special(candies_structured[candy_pos.x][candy_pos.y]);
            // candies_structured[candy_pos.x][candy_pos.y].turn_to_special = true;
        }
    }

    return marks;
}

const remove = () => {
    // y refers to from
    const refill = (col: Candy[], y: number, candies: Candy[]) => {
        col.push(...candies, ...col.splice(y));
    };

    // Removed element positions
    let happend_in_here: Array<Pos> = [];

    let turn_into_special: JQuery<HTMLElement>[] = [];
    let toRemove: JQuery<HTMLElement>[] = [];

    for(let x = 0; x != lvl.n; x++){
        let column = candies_structured[x];
        let original_length = column.length;
        let fall = 0;

        for(let y = original_length -1 ; y >= 0; y--){
            let candy = column[y];

            // Turn into Special
            if (candy.turn_to_special) {
                candy.html.removeClass(candy.type);
                candy.type = candy_types.special;
                candy.html.addClass(candy.type);
                candy.mark = false;

                turn_into_special.push(candy.html);
            };

            if (candy.mark) {
                fall++;
                column.splice(y, 1);
                happend_in_here.push({...candy.pos});

                // Add To animate cycle
                // candy.html.remove();                
                toRemove.push(candy.html);
            } else if (candy.type == candy_types.void && fall > 0) {

                // Refill
                let new_candies = fallRefill(x, y, fall, 2);
                refill(column, y+1, new_candies);

                fall = 0; // After generateNew !!

            } else {
                animateFall(candy, fall, 2);
                candy.pos.y += fall;
            }
        }

        // Refill
        let difference = original_length - column.length;
        if (difference > 0) {
            let new_candies = fallRefill(x, 0, difference, 2);
            refill(column, 0, new_candies);
        }
    }

    toRemove.forEach(e => {
        animationService.add_v2(() => new Promise<void>(resolve => {
            soundService.playPop();
            e.remove();
            resolve();
        }))
    });

    let max_y = 0;
    let min_x = lvl.n;

    happend_in_here.forEach(pos => {
        min_x = pos.x < min_x ? pos.x : min_x;
        max_y = pos.y > max_y ? pos.y : max_y;
    });

    animationService.moveClock(2);

    detectMatches(min_x, max_y);
}

const detectMatches = (start_x: number, end_y: number) => {

    // Todo :: lvl.n vs candies_structured.length
    let marks = 0;

    for (let x = start_x; x < lvl.n; x++) {

        const column = candies_structured[x];

        for (let y = 0; y <= end_y; y++) {
            const candy = column[y];
            
            if ( candy.type == special || candy.type == candy_types.void ){
                continue;
            } else {
                marks += marker(candy.pos, candy.type);
            }

        }

    }

    if (marks >=  d_num) {
        scoreService.blocksRemoved(marks);
        remove();
    }

}


const animateFall = (candy: Candy, fall: number, anim_delay: number = base_delay) => {

    parseInt(candy.html.css('top'));
    animationService.add_v2(() =>
        new Promise<void> (resolve => 
            candy.html.animate({top: `+=${fall * tile_size}`}, fall_animation_time, () => resolve())
            ), anim_delay);
}

// Fall effect
// animati
const fallRefill = (x: number, y: number, amount: number = 1, animation_delay: number = base_delay): Candy[] => {
    let created_candies: Candy[] = [];
        
    for (let i = 0; i < amount; i++) {
        let pos: Pos = {x,y};
        let candy = generateCandy(pos, true);
        candy.pos.y = amount - i - 1 
        // candy.html.appendTo(game_area);

        created_candies.unshift(candy);

        animationService.add_v2(() => new Promise<void> (resolve => {
            setTimeout(() => {
                candy.html.appendTo(game_area);
                // animateFall(candy, (amount - i), animation_delay);
                candy.html.animate({top: `+=${(amount - i) * tile_size}`}, fall_animation_time, () => resolve())
            }, fall_animation_time * i);
        }), animation_delay);

        
        // setTimeout(()=> candy.html.animate({
        //     top: `+=${(amount - i) * tile_size}`
        // }, fall_animation_time), fall_animation_time * i);
    }

    return created_candies;
};
