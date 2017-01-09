import { keyBy } from 'lodash'
import { Resource, AsyncValue, ResourceQuery, HasHTTPClient, HttpClient } from 'reboot-core'

export interface GuestbookPost {
	userId: number;
	id: number;
	title: string;
	body: string;
}

export class GuestbookService {
  private http: HttpClient
  private posts: Resource<GuestbookPost>
  private query: ResourceQuery<{}, GuestbookPost>

  constructor(opts: HasHTTPClient & { store: any }) {
    this.http = opts.http
    this.posts = new Resource({
      key: 'guestbook',
      store: opts.store,
      fetch: id => (this.http('https://jsonplaceholder.typicode.com/posts')
        .then<GuestbookPost>(r => r.json())
      )
    })
    this.query = this.posts.query('all', async (_, update) => {
      const posts = await this.http('https://jsonplaceholder.typicode.com/posts').then<GuestbookPost[]>(r => r.json())
      update(keyBy(posts, 'id'))

      return posts.map(x => String(x.id))
    })
    this.query.setQuery('all', {})
  }

  get allPosts() {
    return this.query.$('all')
      .compose(AsyncValue.waitFor)
      .flatten()
  }

  update(id: number, value: Partial<GuestbookPost>) {
    this.posts.mutate(String(id), { type: 'patch', deltaValue: value }, () =>
      this.http(`https://jsonplaceholder.typicode.com/posts/${id}`, { method: 'patch' })
    )
  }

  delete(id: number) {
    this.posts.mutate(String(id), { type: 'delete' }, () =>
      this.http(`https://jsonplaceholder.typicode.com/posts/${id}`, { method: 'delete' })
    )
  }
}
