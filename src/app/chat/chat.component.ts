import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Mensaje } from './models/mensaje';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  private client: Client;
  conectado: boolean = false;
  mensaje: Mensaje = new Mensaje();
  mensajes: Mensaje[] = [];
  escribiendo: string;
  clienteId: string;

  constructor() {
    this.clienteId = 'id-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2);
  }

  ngOnInit(): void {
    this.client = new Client();

    this.client.webSocketFactory = () => {
      /** Meme enpoint definit dans le broker dans le back */
      return new SockJS('http://localhost:8080/chat-websocket');
    };
    /** Ecouter l'événement connection */
    this.client.onConnect = (frame) => {
      console.log('Connectados: ' + this.client.connected + ' : ' + frame);
      this.conectado = true;

      /** Ecouter les messages envoyés */
      this.client.subscribe('/chat/mensaje', e => {
        const mensaje = JSON.parse(e.body) as Mensaje;
        mensaje.fecha = new Date(mensaje.fecha);


        if (!this.mensaje.color && mensaje.tipo == 'NUEVO_USUARIO' &&
            this.mensaje.username == mensaje.username){
              this.mensaje.color = mensaje.color;
            }


        this.mensajes.push(mensaje);
        console.log(mensaje);

      });

      this.client.subscribe('/chat/escribiendo', e => {
        console.log('evement esta escribiendo');

        this.escribiendo = e.body;
        setTimeout(() => this.escribiendo = '', 3000);

      });

      this.client.subscribe(`/chat/historial/${this.clienteId}`, e => {
        const historial = JSON.parse(e.body) as Mensaje[];
        this.mensajes = historial.map(m => {
          m.fecha = new Date(m.fecha);
          return m;
        }).reverse();
      });

      /** Une fois suscrit au messages "/chat/historial/clienteId" on demande a recevoir ces messages */
      this.client.publish({destination: '/app/historial', body: this.clienteId});


      this.mensaje.tipo = 'NUEVO_USUARIO';
      this.client.publish({destination: '/app/mensaje', body: JSON.stringify(this.mensaje)});
    };

    /** Ecouter l'événement desconnection */
    this.client.onDisconnect = (frame) => {
      console.log('Desconnectados: ' + !this.client.connected + ' : ' + frame);
      this.conectado = false;
      this.mensaje = new Mensaje();
      this.mensajes = [];
    };


  }

  conectar(): void{
     /** Pour se connecter au broker */
     this.client.activate();
  }

  desconectar(): void{
    this.client.deactivate();
  }

  enviarMensaje(): void{
    this.mensaje.tipo = 'MENSAJE';
    this.client.publish({destination: '/app/mensaje', body: JSON.stringify(this.mensaje)});
    this.mensaje = new Mensaje();
  }

  escribiendoEvento(): void{
    this.client.publish({destination: '/app/escribiendo', body: this.mensaje.username});

  }
}
