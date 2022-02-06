export interface SendToObsidianMessage {
  type: 'send-to-obsidian',
  url: string
  title: string
}

export type Message = SendToObsidianMessage

export interface ResultMessage {
  ok: boolean
}

export interface ExtensionSettings {
  apiKey: string
  contentTemplate: string
  urlTemplate: string
  headerTemplate: string
  method: 'post' | 'put' | 'patch'
}
