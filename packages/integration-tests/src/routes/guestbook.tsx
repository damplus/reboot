import * as React from 'react'
import { addStore, addHttpClient, ResourceMutation, applyResourceMutation } from 'reboot-core'

import { GuestbookService, GuestbookPost } from '../services/guestbook'
import root from './root'

export default () => root()
  .subroute('/guestbook')
  .use(addStore())
  .use(addHttpClient())
  .title('Guestbook')
  .add('guestbook', GuestbookService)
  .render(renderGuestbook)


interface GuestbookViewProps {
  guestbook: GuestbookService
}

export function renderGuestbook({ guestbook }: GuestbookViewProps) {
  return guestbook.allPosts.map(posts =>
    <div>
      <h2>Posts</h2>
      {
        posts.map(post => {
          if (post.status === 'loaded') {
            return (
              <GuestbookPostView
                key={post.value.id}
                value={post.value}
                onChange={x => guestbook.update(post.value.id, x)}
                onDelete={() => guestbook.delete(post.value.id)}
                mutation={post.mutation}
              />
            )

          } else {
            return undefined
          }
        })
      }
    </div>
  )
}

interface GuestbookPostViewProps {
  value: GuestbookPost
  onChange(x: Partial<GuestbookPost>): void
  onDelete(): void
  mutation?: ResourceMutation<GuestbookPost>
}

interface GuestbookPostViewState {
  bodyEdit?: string
}

export class GuestbookPostView extends React.Component<GuestbookPostViewProps, GuestbookPostViewState> {
  state: GuestbookPostViewState = {}

  render() {
    const { props: { value, onChange, onDelete, mutation }, state: { bodyEdit } } = this

    return (
      <div>
        <h3>{value.title}</h3>
        <textarea
          value={bodyEdit || applyResourceMutation(value, mutation).body}
          onChange={e => this.setState({ bodyEdit: e.currentTarget.value })}
          onBlur={() => {
            onChange({ body: bodyEdit })
            this.setState({ bodyEdit: undefined })
          }}
        />
        <button onClick={onDelete}>Delete</button>
        {
          mutation && `${mutation.type}....`
        }
        <hr />
      </div>
    )
  }
}