import Router from '../../../src/index'
import Vue from 'vue'

describe('router.onReady', () => {
  it('should work', done => {
    const calls = []

    const router = new Router({
      mode: 'abstract',
      routes: [
        {
          path: '/a',
          component: {
            name: 'A',
            beforeRouteEnter: (to, from, next) => {
              setTimeout(() => {
                calls.push(2)
                next()
              }, 1)
            }
          }
        }
      ]
    })

    router.beforeEach((to, from, next) => {
      setTimeout(() => {
        calls.push(1)
        next()
      }, 1)
    })

    router.onReady(() => {
      expect(calls).toEqual([1, 2])
      // sync call when already ready
      router.onReady(() => {
        calls.push(3)
      })
      expect(calls).toEqual([1, 2, 3])
      done()
    })

    router.push('/a')
    expect(calls).toEqual([])
  })
})

describe('route matching', () => {
  it('resolves parent params when using current route', () => {
    const router = new Router({
      mode: 'abstract',
      routes: [
        {
          path: '/a/:id',
          component: { name: 'A' },
          children: [{ name: 'b', path: 'b', component: { name: 'B' }}]
        }
      ]
    })

    router.push('/a/1')

    const { route, resolved } = router.resolve({ name: 'b' })
    expect(route.params).toEqual({ id: '1' })
    expect(resolved.params).toEqual({ id: '1' })
  })

  it('can override currentRoute', () => {
    const router = new Router({
      mode: 'abstract',
      routes: [
        {
          path: '/a/:id',
          component: { name: 'A' },
          children: [{ name: 'b', path: 'b', component: { name: 'B' }}]
        }
      ]
    })

    router.push('/a/1')

    const { route, resolved } = router.resolve({ name: 'b' }, { params: { id: '2' }, path: '/a/2' })
    expect(route.params).toEqual({ id: '2' })
    expect(resolved.params).toEqual({ id: '2' })
  })
})

describe('router.addRoutes', () => {
  it('should work', () => {
    const router = new Router({
      mode: 'abstract',
      routes: [
        { path: '/a', component: { name: 'A' }}
      ]
    })

    router.push('/a')
    let components = router.getMatchedComponents()
    expect(components.length).toBe(1)
    expect(components[0].name).toBe('A')

    router.push('/b')
    components = router.getMatchedComponents()
    expect(components.length).toBe(0)

    router.addRoutes([
      { path: '/b', component: { name: 'B' }}
    ])
    components = router.getMatchedComponents()
    expect(components.length).toBe(1)
    expect(components[0].name).toBe('B')

    // make sure it preserves previous routes
    router.push('/a')
    components = router.getMatchedComponents()
    expect(components.length).toBe(1)
    expect(components[0].name).toBe('A')
  })
})

describe('router.push/replace callbacks', () => {
  let calls = []
  let router, spy1, spy2

  const Foo = {
    beforeRouteEnter (to, from, next) {
      calls.push(3)
      setTimeout(() => {
        calls.push(4)
        next()
      }, 1)
    }
  }

  beforeEach(() => {
    calls = []
    spy1 = jasmine.createSpy('complete')
    spy2 = jasmine.createSpy('abort')

    router = new Router({
      routes: [
        { path: '/foo', component: Foo }
      ]
    })

    router.beforeEach((to, from, next) => {
      calls.push(1)
      setTimeout(() => {
        calls.push(2)
        next()
      }, 1)
    })
  })

  it('push complete', done => {
    router.push('/foo', () => {
      expect(calls).toEqual([1, 2, 3, 4])
      done()
    })
  })

  it('push abort', done => {
    router.push('/foo', spy1, spy2)
    router.push('/bar', () => {
      expect(calls).toEqual([1, 1, 2, 2])
      expect(spy1).not.toHaveBeenCalled()
      expect(spy2).toHaveBeenCalled()
      done()
    })
  })

  it('replace complete', done => {
    router.replace('/foo', () => {
      expect(calls).toEqual([1, 2, 3, 4])
      done()
    })
  })

  it('replace abort', done => {
    router.replace('/foo', spy1, spy2)
    router.replace('/bar', () => {
      expect(calls).toEqual([1, 1, 2, 2])
      expect(spy1).not.toHaveBeenCalled()
      expect(spy2).toHaveBeenCalled()
      done()
    })
  })
})

describe('router app destroy handling', () => {
  it('should remove destroyed apps from this.apps', () => {
    Vue.use(Router)

    const router = new Router({
      mode: 'abstract',
      routes: [
        { path: '/', component: { name: 'A' }}
      ]
    })

    expect(router.apps.length).toBe(0)
    expect(router.app).toBe(null)

    // Add main app
    const app1 = new Vue({
      router,
      render (h) { return h('div') }
    })
    expect(router.app).toBe(app1)
    expect(router.apps.length).toBe(1)
    expect(router.app[0]).toBe(app1)

    // Add 2nd app
    const app2 = new Vue({
      router,
      render (h) { return h('div') }
    })
    expect(router.app).toBe(app1)
    expect(router.apps.length).toBe(2)
    expect(router.app[0]).toBe(app1)
    expect(router.app[1]).toBe(app2)

    // Add 3rd app
    const app3 = new Vue({
      router,
      render (h) { return h('div') }
    })
    expect(router.app).toBe(app1)
    expect(router.apps.length).toBe(3)
    expect(router.app[0]).toBe(app1)
    expect(router.app[1]).toBe(app2)
    expect(router.app[2]).toBe(app3)

    // Destroy second app
    app2.$destroy()
    expect(router.app).toBe(app1)
    expect(router.apps.length).toBe(2)
    expect(router.app[0]).toBe(app1)
    expect(router.app[1]).toBe(app3)

    // Destroy 1st app
    app1.$destroy()
    expect(router.app).toBe(app3)
    expect(router.apps.length).toBe(1)
    expect(router.app[0]).toBe(app3)

    // Destroy 3rd app
    app3.$destroy()
    expect(router.app).toBe(app3)
    expect(router.apps.length).toBe(0)

    // Add 4th app (should be the only app)
    const app4 = new Vue({
      router,
      render (h) { return h('div') }
    })
    expect(router.app).toBe(app4)
    expect(router.apps.length).toBe(1)
    expect(router.app[0]).toBe(app4)
  })
})
