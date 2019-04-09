import * as Matter from 'matter-js';

export type Code = {
  world: any,
  bodies: any[],
  errors: {}[],
  shapeFuncMap?: { [key: string]: (ctx: Arare2, options: {}) => (x: number, y: number, index: number) => any },
};

// (Arare2, {}) -> (number, number, number) -> any

const shapeFuncMap : {[key: string]: (ctx: Arare2, options: {}) => (x: number, y: number, index: number) => any } = {
  circle(ctx: Arare2, options: {}) {
    return function (x, y, index) {
      let radius = options['radius'] || 25;
      if (options['width']) {
        radius = options['width'] / 2;
      }
      return Matter.Bodies.circle(x, y, radius, options);
    };
  },
  rectangle(ctx: Arare2, options: {}) {
    return function (x, y, index) {
      return Matter.Bodies.rectangle(x, y, options['width'] || 100, options['height'] || 100, options);
    };
  },
  unknown(ctx: Arare2, options: {}) {
    return function (x, y, index) {
      let radius = options['radius'] || 25;
      if (options['width']) {
        radius = options['width'] / 2;
      }
      return Matter.Bodies.circle(x, y, radius, options);
    };
  },
};

const shapeFunc = (code: Code, options: {}) => {
  const shape = options['shape'] || 'unknown';
  if (code.shapeFuncMap && code.shapeFuncMap[shape]) {
    return code.shapeFuncMap[shape];
  }  if (shapeFuncMap[shape]) {
    return shapeFuncMap[shape];
  }
  return shapeFuncMap['unknown'];
};

export class Arare2 {
  protected width: number;
  protected height: number;

  protected runner: Matter.Runner;
  protected engine: Matter.Engine;
  protected render: Matter.Render;
  protected canvas: HTMLCanvasElement;

  protected debug: boolean;

  public vars: {};

  public constructor(width:number, height:number) {
    this.width = width;
    this.height = height;
    // create an engine
    this.engine = Matter.Engine.create();
    /* engineのアクティブ、非アクティブの制御を行う */
    this.runner = Matter.Runner.create({});
    const renderOptions = {
      /* Matter.js の変な仕様 canvas に新しい canvas が追加される */
      element: document.getElementById('canvas'),
      engine: this.engine,
      options: {
        /* オブジェクトが枠線のみになる */
        width: this.width,
        height: this.height,
        background: 'rgba(0, 0, 0, 0)',
        wireframes: false,
        // showDebug: world.debug || false,
        // showPositions: world.debug || false,
        // showMousePositions: world.debug || false,
        // debugString: "hoge\nこまったなあ",
      },
    };
    this.render = Matter.Render.create(renderOptions);
    this.canvas = this.render.canvas;
  }

  public set_window_size(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getRender(): Matter.Render {
    return this.render;
  }

  public getDebug(): boolean {
    return this.debug;
  }

  public setDebug(debug: boolean) {
    this.debug = debug;
  }

  public ready() {
    Matter.Runner.run(this.runner, this.engine); / *物理エンジンを動かす * /;
    Matter.Render.run(this.render); /* 描画開始 */
    this.runner.enabled = false;  / *初期位置を描画したら一度止める * /;
  }

  public start() {
    // console.log("start");
    this.runner.enabled = true;
  }

  public pause() {
    // console.log("pause");
    this.runner.enabled = false;
  }

  public dispose() {
    if (this.runner) {
      Matter.Runner.stop(this.runner);
      this.runner = null;
    }
    if (this.engine) {
      // Matter.World.clear(this.engine.world);
      Matter.Engine.clear(this.engine);
      this.engine = null;
    }
    if (this.render) {
      Matter.Render.stop(this.render);
      // render.canvas.remove();
      // render.canvas = null;
      // render.context = null;
      // render.textures = {};
    }
  }

  public load(code: Code) {
    if (code.world) {
      const world = code.world;
      Matter.Render['lookAt'](this.render, {
        min: { x: 0, y: 0 },
        max: {
          x: world['width'] || 1000,
          y: world['height'] || 1000,
        },
      });
    }
    if (code.errors) {
      // this.notify(this, code.errors);
    }
    if (code.bodies) {
      const bodies = [];
      this.vars = {};
      for (const data of code.bodies) {
        if (data.shape && data.position) {
          const shape = shapeFunc(code, data)(this, data);
          const body = shape(data.position.x, data.position.y, -1);
          if (data.name) {
            this.vars[data.name] = body;
          }
          if (body.id) {
            bodies.push(body);
          }
        }
        /*  else {
          if(data.x && data.y) {
            data.deref = data.deref || defaultDeref;
            vars.push(data);
          }
        }*/
      }
      Matter.World.add(this.engine.world, bodies);
      /*
      if(vars.length > 0) {
        this.render.options.variables = vars;
      }
      if (code.rules) {
        code.rules(Matter, this);
      }
      */
      this.ready();
    }
  }

  public compile(inputs: string) {
    $.ajax({
      url: '/compile',
      type: 'POST',
      data: {
        source: inputs,
      },
      timeout: 5000,
    }).done((data) => {
      this.load(data);
    }).fail((XMLHttpRequest, textStatus, errorThrown) => {
      console.log(`XMLHttpRequest : ${XMLHttpRequest}`);
      console.log(errorThrown);
      console.log(textStatus);
    }).always((data) => {
      console.log(data);
    });
  }
}
