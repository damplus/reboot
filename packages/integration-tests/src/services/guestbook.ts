import { keyBy } from 'lodash'
import { Resource, HasHTTPClient, HttpClient } from 'reboot-core'

export interface GuestbookPost {
	userId: number;
	id: number;
	title: string;
	body: string;
}

export class GuestbookService {
  private http: HttpClient
  private posts: Resource<GuestbookPost>

  constructor(opts: HasHTTPClient & { store: any }) {
    this.http = opts.http
    this.posts = new Resource({ key: 'guestbook', store: opts.store }) as any

    this.fetch()
  }

  get allPosts() {
    return this.posts.$()
  }

  fetch() {
    this.posts.fetchMany([], async () => {
      const posts = await this.http('https://jsonplaceholder.typicode.com/posts').then<GuestbookPost[]>(r => r.json())
      return keyBy(posts, 'id')
    })
  }

  update(id: number, value: Partial<GuestbookPost>) {
    this.posts.mutate(id, { type: 'patch', value }, () =>
      this.http(`https://jsonplaceholder.typicode.com/posts/${id}`, { method: 'patch' })
    )
  }

  delete(id: number) {
    this.posts.mutate(id, { type: 'delete' }, () =>
      this.http(`https://jsonplaceholder.typicode.com/posts/${id}`, { method: 'delete' })
    )
  }
}
