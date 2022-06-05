class Monster {
    constructor(){
        this.asset;
        this.name;
        this.cr;
        this.power;
        this.hp;
        this.item;
        this.ability;
        this.timing;    
    }

    show(_x, _y){
        fill(0);
        rect(_x, _y, 40);
    }
}