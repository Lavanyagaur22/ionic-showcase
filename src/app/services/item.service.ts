import { Injectable } from '@angular/core';
import {
  ADD_TASK,
  DELETE_TASK,
  GET_TASKS,
  TASK_CREATED_SUBSCRIPTION,
  TASK_DELETED_SUBSCRIPTION,
  TASK_MODIFIED_SUBSCRIPTION,
  UPDATE_TASK
} from './graphql.queries';
import { AllTasks, Task } from './types';
import { VoyagerService } from './voyager.service';
import { VoyagerClient, createOptimisticResponse } from '@aerogear/datasync-js';

@Injectable({
  providedIn: 'root'
})
export class ItemService {

  private readonly apollo: VoyagerClient;

  constructor(private aeroGear: VoyagerService) {
    this.apollo = aeroGear.apolloClient;
  }

  getItems() {
    return this.apollo.query<AllTasks>({
      query: GET_TASKS,
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }

  createItem(title, description) {
    const item = {
      'title': title,
      'description': description,
    };
    return this.apollo.mutate<Task>({
      mutation: ADD_TASK,
      variables: item,
      optimisticResponse: createOptimisticResponse('createTask', 'Task', item),
      update: this.updateCacheOnAdd
    });
  }

  updateItem(newValues) {
    return this.apollo.mutate<Task>({
      mutation: UPDATE_TASK,
      variables: newValues,
      optimisticResponse: createOptimisticResponse('updateTask', 'Task', newValues),
      update: this.updateCacheOnEdit
    });
  }

  deleteItem(item) {
    return this.apollo.mutate<Task>({
      mutation: DELETE_TASK,
      variables: { id: item.id },
      update: this.updateCacheOnDelete
      optimisticResponse: createOptimisticResponse('deleteTask', 'Task', item.id),
    });
  }

  subscribeToUpdate(observer?: (value: any) => void) {
    return this.apollo.subscribe<any>({ query: TASK_MODIFIED_SUBSCRIPTION }).subscribe(observer);
  }

  subscribeToDelete(observer?: (value: any) => void) {
    return this.apollo.subscribe({ query: TASK_DELETED_SUBSCRIPTION }).subscribe(observer);
  }

  subscribeToNew(observer?: (value: any) => void) {
    return this.apollo.subscribe<any>({ query: TASK_CREATED_SUBSCRIPTION }).subscribe(observer);
  }

  // Cache processors

  updateCacheOnDelete(cache, { data: { deleteTask } }) {
    const { allTasks } = cache.readQuery({ query: GET_TASKS });
    const newData = allTasks.filter((item) => {
      return deleteTask !== item.id;
    });
    cache.writeQuery({
      query: GET_TASKS,
      data: {
        'allTasks': newData
      }
    });
  }

  updateCacheOnAdd(cache, { data: { createTask } }) {
    const { allTasks } = cache.readQuery({ query: GET_TASKS });
    cache.writeQuery({
      query: GET_TASKS,
      data: {
        'allTasks': allTasks.concat([createTask])
      }
    });
  }

  updateCacheOnEdit() {
    // No work - edits will persist the same id of the item
  }
}
